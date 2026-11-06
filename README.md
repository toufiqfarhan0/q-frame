# Q-Frame

**A research prototype and empirical benchmark for post-quantum frame transaction admission on alternative mempools**

An implementation of post-quantum signature verification within native execution frames ([EIP-8141](https://eips.ethereum.org/EIPS/eip-8141), Transaction Type `0x06`) evaluated under alternative mempool admission rules ([ERC-8421](https://ethereum-magicians.org/t/erc-8421-frame-transaction-alternative-mempools/29800) / [forshtat/ERCs PR #6](https://github.com/forshtat/ERCs/pull/6)) and two-dimensional keyed nonces ([EIP-8250](https://eips.ethereum.org/EIPS/eip-8250)).

The current implementation deploys `PQBenchmarkAccount` on the Hegotá Ethrex Devnet, implementing native EIP-8141 frame verification hooks (`HegotaSupport`) and calibrating verification gas envelopes against NIST FIPS 205 (SLH-DSA / SPHINCS+) parameter profiles. Verification gas sweeps demonstrate the 100,000 gas boundary enforced by standard mempools and the 1,000,000 gas extended ceiling unlocked via staked collateral in `NaiveStakingRegistry`. To resolve the critical key-exhaustion vulnerability where Replace-By-Fee (RBF) fee-bumping forces one-time signature (OTS) leaf reuse, Q-Frame formalizes a two-dimensional nonce binding $\text{nonceKey} = \text{leafIndex}$ using the native EIP-8250 `NONCE_MANAGER` predeploy (`0x...8250`). All contracts, internal Yul accelerator libraries, deployment receipts (7.26M devnet gas), and execution calls (Block `#1,318,311`) are verified on-chain. See [checkpoint 1A](./reviews/CHECKPOINT_1A.md) for empirical gas curves, [checkpoint 1B](./reviews/CHECKPOINT_1B.md) for the 3-state admission protocol, [checkpoint 1C](./reviews/CHECKPOINT_1C.md) for the keyed-nonce OTS formalization, [devnet feedback](./FEEDBACK.md) for EF Access Layer findings, and [deployment record](./deployment.md) for the complete address inventory.

Target bounty track: **Ethereum Foundation — Best use of the Frame Transaction Alternative Mempool** ($5,000 bounty).

---

## What is Q-Frame?

Q-Frame explores the verification budget requirements of post-quantum cryptographic primitives within native Ethereum account abstraction (EIP-8141) and demonstrates how alternative mempools (ERC-8421) safely expand validation ceilings without introducing uncompensated P2P denial-of-service vectors.

See [`FEEDBACK.md`](./FEEDBACK.md) for devnet developer experience notes, client discrepancies, and feedback for the EF Access Layer team.

---

## Repository layout

| Path | What lives here |
| --- | --- |
| `mempool-workshop/contracts/` | `PQBenchmarkAccount.sol`, `HegotaMocks.sol`, and the Foundry gas curve test suite (`GasCurveTest.t.sol`). |
| `mempool-workshop/src/` | TypeScript runner scripts for the 7-step workshop sequence and the single-command comparative benchmark (`step_pq_benchmark.ts`). |
| `web/` | Swiss Design Gráfico web dashboard, live devnet RPC health monitoring, universal wallet modal (MetaMask, Phantom, Rabby, Coinbase, EIP-6963), and interactive benchmark trigger. |
| `reviews/` | Checkpoint documentation for gas calibration ([`CHECKPOINT_1A.md`](./reviews/CHECKPOINT_1A.md)), staking mechanics ([`CHECKPOINT_1B.md`](./reviews/CHECKPOINT_1B.md)), and keyed nonces ([`CHECKPOINT_1C.md`](./reviews/CHECKPOINT_1C.md)). |
| `deployment.md` | Canonical deployment manifest, complete address inventory, Yul accelerator library documentation, and verified block explorer transaction records. |
| `FEEDBACK.md` | Written findings and protocol feedback for the Ethereum Foundation Access Layer team. |

---

## Limitations

- **Cryptographic Computational Envelope:** `PQBenchmarkAccount` benchmarks the cryptographic hash-chain verification workload (Winternitz OTS / NIST FIPS 205 SLH-DSA parameters) within native execution frames; it is not an end-to-end lattice verifier (ML-DSA / Dilithium requires dedicated NTT polynomial precompiles).
- **Consensus & Sidecar Assumptions:** ERC-8421 guarantees assume an honest majority of sidecar validators adhering to the reputation tracking protocol. On a single-node devnet, reputation decay is simulated via Gateway RPC headers.
- **Devnet Ephemerality:** Hegotá and the sidecar gateway operate ephemeral devnets subject to periodic state resets. Receipts are permanently recorded in [`deployment.md`](./deployment.md) and [`FEEDBACK.md`](./FEEDBACK.md).

---

## Mechanism and Verification Scope

Post-quantum signature schemes cannot run within Ethereum's standard mempool:
* **The Computational Burden:** State-of-the-art hash-based schemes (NIST FIPS 205 / SLH-DSA / SPHINCS+) require between **200,000 and 300,000 gas** to verify on-chain (Nethermind benchmarks indicate ~276,000 gas for baseline parameter sets).
* **The Canonical Mempool Bound:** Canonical EIP-8141 mempools strictly cap frame verification gas at **100,000 gas** (`MAX_VERIFY_GAS`) to prevent P2P gossip Denial-of-Service (DoS) attacks.
* **The ERC-8421 Solution:** By locking collateral in an on-chain staking registry (`NaiveStakingRegistry`), senders unlock an extended verification ceiling of **1,000,000 gas** (`MAX_VERIFY_GAS_PER_ENTITY`) in the alternative mempool sidecar.

---

## Architecture: Keyed Nonces for One-Time Signatures (EIP-8250)

### The Collision Problem: Fee-Bumping Destroys Hash-Based Signatures
Hash-based signature schemes (WOTS+, SPHINCS+, XMSS) rely on **One-Time Signature (OTS)** leaves. Each leaf private key can only sign a single message digest. In standard Ethereum:
1. When a transaction is pending in the mempool, fee-bumping (Replace-By-Fee, RBF) requires submitting a new transaction with higher `maxFeePerGas`.
2. Re-signing a new transaction payload under the same OTS leaf exposes a second signature. **Revealing two signatures under one OTS key allows an adversary to compute preimages and forge arbitrary transactions**, catastrophically breaking the account's quantum security.
3. Conversely, signing the replacement with a *new* OTS leaf under a standard linear 1D nonce produces conflicting sequences that standard nodes reject as duplicate nonces.

### The Q-Frame Architecture: Mapping OTS Leaf Indices to EIP-8250 Nonce Keys
The Hegotá devnet natively implements **[EIP-8250](https://eips.ethereum.org/EIPS/eip-8250) Keyed Nonces** via the `NONCE_MANAGER` predeploy (`0x0000000000000000000000000000000000008250`). Nonces are two-dimensional: `(nonceKey, sequence)`.

Q-Frame establishes a formal mapping between post-quantum key state and the mempool's nonce engine:
$$\text{nonceKey} := \text{leafIndex}$$

```
Linear Nonce (Broken on RBF):
[Nonce 42: Msg A (OTS Leaf #7)]  --->  RBF: [Nonce 42: Msg B (OTS Leaf #7)]  ==> FORGERY VULNERABILITY!

EIP-8250 Keyed Nonce (Q-Frame):
Channel (Key #7, Seq 0)  ---> One-Time Sign & Mine (Leaf #7 exhausted, Seq -> 1)
Channel (Key #8, Seq 0)  ---> Concurrently pending in mempool without queue blockage!
```

**Architectural Invariants:**
1. **Parallel Mempool Occupancy:** Transactions using distinct OTS leaves (`Key_A`, `Key_B`) sit pending in the mempool side-by-side without head-of-line blocking (demonstrated in `step_12_tx_keyed_nonces`).
2. **In-Protocol Replay Immunity:** Because each leaf channel has its own sequence, re-signing under an exhausted leaf is rejected at the mempool validation frame before bytecode execution.
3. **No Off-Chain State Bottleneck:** Key-state retirement is tracked by the on-chain `NONCE_MANAGER`, turning stateful PQ key management into an enforced protocol invariant.

See [checkpoint 1C](./reviews/CHECKPOINT_1C.md) for formal proofs and security analysis.

---

## Empirical Benchmark Data

All benchmarks are measured from our Foundry test suite (`contracts/test/GasCurveTest.t.sol`, 13/13 passing) and verified against live Hegotá Devnet receipts.

### 1. Gas Measurements Across Parameter Sets

The verification gas model is calibrated as:
$$\text{Gas} = 37,247 + (\text{Chains} \times \text{Iterations} \times 740)$$

| Configuration Profile | Chains $\times$ Iters | Verification Gas | Canonical Mempool (100k Cap) | Staked Alt-Mempool (1M Cap) |
| :--- | :---: | :---: | :---: | :---: |
| **Minimal Baseline** | $4 \times 10$ | 66,847 gas | **Admitted** | **Admitted** |
| **Threshold Cross** | $8 \times 15$ | 126,047 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted** |
| **Q-Frame Calibrated (FIPS 205)** | $15 \times 20$ | 259,247 gas | <span style="color:red">**Rejected** (Hard Wall)</span> | **Admitted & Mined** |
| **High-Security SPHINCS+** | $20 \times 30$ | 481,247 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted** |
| **Peak Stress Limit** | $30 \times 40$ | 925,247 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted** (<1M) |

See [checkpoint 1A](./reviews/CHECKPOINT_1A.md) for full gas curve plots and derivations.

### 2. Three-State Admission Contrast (Empirical Proof)

The exact same post-quantum verification transaction (259,247 verification gas) was evaluated across three distinct node configurations:

| Evaluation Shot | Target Gateway | Entity State | Gas Limit | Node Outcome |
| :--- | :--- | :---: | :---: | :--- |
| **Shot 1: Canonical Node** | ethrex (`/rpc`) | Any | 100,000 | <span style="color:red">**REJECTED**</span> (`GasExceedsVerificationLimit`) |
| **Shot 2: Unstaked Alt-Mempool** | Sidecar Gateway | Unstaked (0 ETH) | 100,000 | <span style="color:red">**REJECTED**</span> (`UnstakedEntityVerificationCap`) |
| **Shot 3: Staked Alt-Mempool** | Sidecar Gateway | **Staked (0.012 ETH)** | 1,000,000 | <span style="color:green">**ADMITTED & MINED**</span> (Block `#1317596`) |

See [checkpoint 1B](./reviews/CHECKPOINT_1B.md) for the 3-state admission protocol trace.

### 3. Devnet vs Foundry Gas Discrepancy (Resource Accounting)
* **Foundry Execution Gas:** 259,247 gas for the verification loop in isolation.
* **Devnet Transaction Receipt Gas:** **7,264,101 gas** on live devnet deployment receipt.
* **Reason:** The Hegotá Ethrex Devnet enforces a resource-based gas model including a **state gas surcharge** (~183,600 gas per storage slot allocation) and deploys 7 internal helper contracts upon account initialization (`HegotaSupport`).

---

## DoS Protection & Economic Trade-Offs

The ERC-8421 alternative mempool prevents uncompensated Denial-of-Service through four bound constraints:

1. **Collateral at Risk:** Senders must lock $\ge 0.01\text{ ETH}$ ($0.012\text{ ETH}$ implemented in Q-Frame) in `NaiveStakingRegistry` with an unbonding delay of $86,400\text{ seconds}$ (24 hours).
2. **Per-Entity Gas Budget:** The sidecar limits verification gas to `MAX_VERIFY_GAS_PER_ENTITY = 1,000,000`. Nodes refuse transactions that demand more computational work during the `VERIFY` frame.
3. **Reputation Throttling:** The node tracks inclusion efficiency (`SAME_SENDER_MEMPOOL_COUNT = 64`). If an entity submits transactions that are admitted but repeatedly fail block inclusion, its state transitions from `OK` $\to$ `THROTTLED` $\to$ `BANNED`. Banned entities are dropped at the P2P boundary with zero EVM execution.
4. **Storage Access Isolation:** Staked accounts are restricted from accessing un-staked dynamic storage during the `VERIFY` frame, preventing cross-contract storage invalidation griefing.

---

## Prior Art

* **ERC-4337 & RIP-7560:** Account Abstraction separating verification from execution frames. RIP-7560 introduces native consensus transactions; EIP-8141 generalizes this into lightweight execution frames.
* **Nethermind WOTS+ Benchmarks:** Previous investigations into hash-based signature validation in the EVM established ~276,000 gas as the baseline envelope for 128-bit quantum security.
* **EIP-8250:** Keyed Nonce abstraction allowing parallel transaction channels, previously explored for account abstraction but applied here for OTS state retirement.

---

## Getting Started

### 1. Single-Command Evaluation
```bash
# Clone and install dependencies
git clone https://github.com/mansi0xc/otter.git # or current repository
cd eth
yarn install

# Run the complete 3-state comparison demo in one command:
yarn demo
```

### 2. Foundry Contract Tests
```bash
cd mempool-workshop
forge test --root contracts -vv
# 13 / 13 tests passing (GasCurveTest, HegotaMocks, ParameterVerification)
```

### 3. Swiss Design Web Application
```bash
cd web
npm install
npm run dev
# Live at http://localhost:3000
```

---

## Pinned Devnet Specification Targets

The devnet environment runs pinned client commits:
* **Execution Client:** [Ethrex](https://github.com/forshtat/ethrex) branch `eip8141-tracer` (commit `9aa3645d`).
* **EIP-8141 Frame Transactions:** Commit `4a9ad32c` (Type `0x06` wire format, `APPROVE` opcode `0xAA`).
* **EIP-8250 Keyed Nonces:** Commit `81b976ac` (`NONCE_MANAGER` at `0x...8250`).
* **EIP-8272 Recent Roots:** Commit `d8636a33` (`RECENT_ROOT_ADDRESS` at `0x...8272`).
* **Alt-Mempool Rules:** [forshtat/ERCs PR #6](https://github.com/forshtat/ERCs/pull/6) (commit `74a868cd`).

---

## Project Documents

- [`deployment.md`](./deployment.md) — Full Hegotá devnet deployment record: every contract address (`PQBenchmarkAccount`, `NaiveStakingRegistry`, `NONCE_MANAGER`), internal Yul libraries, confirmed transactions, and Dora block explorer verification links.
- [`FEEDBACK.md`](./FEEDBACK.md) — Developer experience friction, specification vs live client discrepancies, and recommendations for the Ethereum Foundation Access Layer team.
- [`reviews/CHECKPOINT_1A.md`](./reviews/CHECKPOINT_1A.md) — Post-quantum gas curve calibration and mathematical model.
- [`reviews/CHECKPOINT_1B.md`](./reviews/CHECKPOINT_1B.md) — 3-door entity staking and admission protocol under ERC-8421.
- [`reviews/CHECKPOINT_1C.md`](./reviews/CHECKPOINT_1C.md) — EIP-8250 Keyed Nonce formalization for post-quantum One-Time Signatures.
- **Dora Devnet Explorer:** [`https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B`](https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B)
- **Alt-Mempool Explorer:** [`https://explorer.altmempool.wtf/`](https://explorer.altmempool.wtf/)

---

## AI Disclosure

In accordance with ETHGlobal hackathon submission guidelines: Generative AI tools (Claude 3.7 Sonnet and Antigravity) were utilized for Next.js frontend component scaffolding, test boilerplate generation, and ASCII diagram formatting. The smart contracts, Foundry benchmark assertions, gas curve derivations, and EIP-8250 keyed-nonce architectural designs were conceptualized and validated directly by the project team.
