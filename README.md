# Q-Frame

**A research prototype and empirical benchmark for post-quantum frame transaction admission on alternative mempools**

An implementation of post-quantum signature verification within native execution frames ([EIP-8141](https://eips.ethereum.org/EIPS/eip-8141), Transaction Type `0x06`) evaluated under alternative mempool admission rules ([ERC-8421](https://ethereum-magicians.org/t/erc-8421-frame-transaction-alternative-mempools/29800) / [forshtat/ERCs PR #6](https://github.com/forshtat/ERCs/pull/6)) and two-dimensional keyed nonces ([EIP-8250](https://eips.ethereum.org/EIPS/eip-8250)).

The current implementation deploys `PQBenchmarkAccount` on the Hegotá Ethrex Devnet, implementing native EIP-8141 frame verification hooks (`HegotaSupport`) and calibrating verification gas envelopes against NIST FIPS 205 (SLH-DSA / SPHINCS+) parameter profiles. Verification gas sweeps demonstrate the 100,000 gas boundary enforced by standard mempools and the 2,000,000 gas extended ceiling unlocked via staked collateral in `NaiveStakingRegistry`. To explore key-state management for One-Time Signatures (OTS), Q-Frame investigates a two-dimensional nonce binding $\text{nonceKey} = \text{leafIndex}$ using the native EIP-8250 `NONCE_MANAGER` predeploy (`0x...8250`) to enable parallel leaf channels and protocol-enforced leaf retirement upon mining (while documenting the remaining open challenge of safe fee-bumping for one-time keys). All contracts, internal Yul accelerator libraries, deployment receipts (7.26M devnet gas), and execution calls (Block `#1,318,311`) are verified on-chain. See [checkpoint 1A](./reviews/CHECKPOINT_1A.md) for empirical gas curves, [checkpoint 1B](./reviews/CHECKPOINT_1B.md) for the 3-state admission protocol, [checkpoint 1C](./reviews/CHECKPOINT_1C.md) for the keyed-nonce OTS formalization, [devnet feedback](./FEEDBACK.md) for EF Access Layer findings, and [deployment record](./deployment.md) for the complete address inventory.

---

## What is Q-Frame?

Q-Frame explores the verification budget requirements of post-quantum cryptographic primitives within native Ethereum account abstraction (EIP-8141) and demonstrates how alternative mempools (ERC-8421) safely expand validation ceilings without introducing uncompensated P2P denial-of-service vectors.

See [`FEEDBACK.md`](./FEEDBACK.md) for devnet developer experience notes, client discrepancies, and feedback for the EF Access Layer team.

---

## Repository layout

| Path | What lives here |
| --- | --- |
| `mempool-workshop/src/sdk/` | The `LeafManager` TypeScript SDK (`LeafManager.ts`) for on-chain leaf synchronization, EIP-8250 channel discovery, and ERC-8421 mempool admission routing. |
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

Standard-size post-quantum signature schemes challenge Ethereum's standard mempool validation budget:
* **The Computational Envelope:** While highly compressed or tuned schemes (such as WOTS+C at ~73k gas and FORS+C at ~35k gas) can fit under 100,000 gas, standard-size NIST FIPS 204/205 parameter sets (SLH-DSA / SPHINCS+ and lattice-based ML-DSA / Dilithium) demand between **250,000 and over 1,500,000 gas** in EVM verification without dedicated precompiles (Nethermind benchmarks indicate ~276,000 gas for baseline SPHINCS+).
* **The Canonical Mempool Bound:** Canonical EIP-8141 mempools strictly cap frame verification gas at **100,000 gas** (`MAX_VERIFY_GAS`) to prevent P2P gossip Denial-of-Service (DoS) attacks.
* **The ERC-8421 Solution:** By locking collateral in an on-chain staking registry (`NaiveStakingRegistry`), senders unlock an extended verification ceiling of **2,000,000 gas** (`MAX_VERIFY_GAS_PER_ENTITY`, recently expanded from 1,000,000 gas by the EF Access Layer team) in the alternative mempool sidecar. This acts as the necessary safety valve for heavy cryptographic verification.

---

## Architecture: Keyed Nonces for One-Time Signatures (EIP-8250)

### 1. The One-Time Signature Constraint
Hash-based signature schemes (WOTS+, SPHINCS+, XMSS) rely on **One-Time Signature (OTS)** leaves. Each leaf private key can only sign a single message digest. In standard EVM with linear nonces:
1. All pending transactions from an account share a single serialized queue.
2. If an adversary observes two distinct signatures under the same OTS leaf, they can compute hash-chain intersections to forge valid signatures for other messages.
3. Linear nonces provide no channel separation for stateful cryptographic keys.

### 2. Parallel Channels and Protocol-Enforced Leaf Retirement
The Hegotá devnet natively implements **[EIP-8250](https://eips.ethereum.org/EIPS/eip-8250) Keyed Nonces** via the `NONCE_MANAGER` predeploy (`0x0000000000000000000000000000000000008250`). Nonces are two-dimensional: `(nonceKey, sequence)`.

Q-Frame explores mapping post-quantum key state directly to the mempool's nonce engine:
$$\text{nonceKey} := \text{leafIndex}$$

```
Linear Nonce (Single Serialized Queue):
[Nonce 42: Msg A (Leaf #7)] ---> Head-of-line blocking for subsequent keys

EIP-8250 Keyed Nonce (Parallel Channels):
Channel (Key #7, Seq 0) ---> Signs Msg A & mines (Leaf #7 retired, Seq -> 1)
Channel (Key #8, Seq 0) ---> Concurrently pending in mempool without queue blocking!
```

**Architectural Observations:**
1. **Parallel Mempool Occupancy:** Transactions using distinct OTS leaves (`Key_A`, `Key_B`) sit pending in the mempool side-by-side on independent channels without head-of-line blocking (demonstrated in `step_12_tx_keyed_nonces`).
2. **On-Chain Nullifier / Retirement:** Once a transaction is included in a block, the on-chain sequence for that key advances ($\text{Seq} \to 1$). Any replayed transaction attempting to reuse the exhausted leaf is rejected at the mempool validation frame before execution.

### 3. Open Challenge: Fee-Bumping (Replace-By-Fee) with One-Time Keys
It is important to emphasize that **safe fee-bumping with one-time keys remains an open research problem**:
* Fee-bumping (RBF) requires replacing an existing pending transaction at the *same* nonce.
* If the nonce key is the leaf index, submitting a replacement transaction with higher `maxFeePerGas` either:
  1. Re-signs under the same leaf key (the exact vulnerability, revealing two signatures and allowing forgery), or
  2. Signs under a new leaf key (which creates a separate, concurrent transaction on a new channel rather than replacing the pending one; if gas prices subsequently drop, both transactions could be included).
* We document this trade-off as an architectural consideration for post-quantum wallet designers.

---

## The Q-Frame LeafManager SDK

To address the practical operational challenges of stateful post-quantum hash trees, we packaged our EIP-8250 research into a published client SDK on npm ([`q-frame-sdk`](https://www.npmjs.com/package/q-frame-sdk)):

```bash
npm install q-frame-sdk viem
```

### The Core Problem: "On-Chain Spent" $\neq$ "Signature Revealed"
A stateful hash-based leaf is exposed as soon as a transaction is signed and broadcast. If the transaction drops or gets abandoned in the mempool, its on-chain sequence remains `0`. If a user restores their wallet on a new device, a naive on-chain scan would re-allocate that unmined leaf, revealing a second signature and destroying the account's security.

### Four-State Key Lifecycle & Safety Invariants
The `LeafManager` manages a robust four-state machine:
* **`UNUSED`**: Unspent on-chain and not present in local journal (safe to allocate).
* **`RESERVED`**: Written to a local **write-ahead journal** immediately upon allocation before signing; never re-allocated even if the transaction fails.
* **`MINED`**: Sequence $\ge 1$ verified in `NONCE_MANAGER` storage (`0x...8250`).
* **`BURNED`**: Explicitly retired via fee-bumping or cancellation policy.

```typescript
import { LeafManager } from "q-frame-sdk";

const manager = new LeafManager({
  rpcUrl: "https://rpc1.hegota.ethrex.xyz",
  walletAddress: "0xe5c5A34833db3A90E30adCD98f2955E36496483B",
  canonicalCap: 100_000,
  altMempoolCap: 2_000_000,
});

// 1. Allocate parallel unspent channels (marked RESERVED in write-ahead journal)
const [leafA, leafB, leafC] = await manager.allocateParallelLeaves(3);

// 2. Safe Fee-Bumping: burns Leaf #A forever and allocates fresh replacement channel
const bump = await manager.bumpFee(leafA, "Gas escalation");
console.log(`Burned: #${bump.burnedOldLeafIndex}, Replacement: #${bump.newLeafIndex}`);

// 3. Zero-State Wallet Recovery with Skip-Ahead Gap
// Scans highest on-chain mined leaf and jumps forward (+16 leaves) to protect unmined signatures
const recovery = await manager.recoverWallet(64, 16);
console.log(`Highest mined: #${recovery.highestMinedLeaf}, Resuming allocation at: #${recovery.resumeIndex}`);

// 4. Mempool Admission Routing
const decision = manager.routeMempool(259_247, true);
// => { targetMempool: "alt-mempool", admitted: true, reason: "Admitted into ERC-8421..." }
```

### Live Devnet Verification (`yarn leaf_demo`)
Run the live devnet verification script:
```bash
cd mempool-workshop
yarn leaf_demo
```
**Executed on Hegotá Devnet (Block `#2782`):**
1. Allocates 3 parallel leaf channels (`#0, #1, #2`).
2. Demonstrates safe fee-bumping: marks `#0` as `BURNED` and allocates `#3`.
3. Broadcasts frame transaction with namespaced key for Leaf `#3` to the live devnet.
4. Mined in Block `#2782`; queries `NONCE_MANAGER` via `eth_getStorageAt` and confirms sequence moved $0 \to 1$.
5. Simulates wallet recovery on a fresh device without local journal: scans on-chain storage, finds highest mined leaf (`#3`), applies the safety gap (+16), and safely resumes at Leaf `#20`, successfully skipping unmined Leaf `#1`.

---

## Empirical Benchmark Data

All benchmarks are measured from our Foundry test suite (`contracts/test/GasCurveTest.t.sol`, 13/13 passing) and verified against live Hegotá Devnet receipts.

### 1. Gas Measurements Across Parameter Sets

The verification gas model is calibrated as:
$$\text{Gas} = 37,247 + (\text{Chains} \times \text{Iterations} \times 740)$$

| Configuration Profile | Chains $\times$ Iters | Verification Gas | Canonical Mempool (100k Cap) | Staked Alt-Mempool (2M Cap) |
| :--- | :---: | :---: | :---: | :---: |
| **Minimal Baseline** | $4 \times 10$ | 66,847 gas | **Admitted** | **Admitted** |
| **Threshold Cross** | $8 \times 15$ | 126,047 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted** |
| **Q-Frame Calibrated (FIPS 205)** | $15 \times 20$ | 259,247 gas | <span style="color:red">**Rejected** (Hard Wall)</span> | **Admitted & Mined** |
| **High-Security SPHINCS+** | $20 \times 30$ | 481,247 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted** |
| **Deep SPHINCS+ Trees** | $30 \times 50$ | 1,147,247 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted (<2M)** |
| **Peak 2M Stress Limit** | $35 \times 75$ | 1,980,247 gas | <span style="color:red">**Rejected** (>100k)</span> | **Admitted (<2M)** |

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

## Arkiv DB-Chain Integration (Decentralized Ephemeral Journal)

To solve multi-device state synchronization and eliminate key-reuse attacks for One-Time Signatures (OTS) without relying on a centralized database, Q-Frame integrates the **Arkiv Network** (Rabdi DB-Chain Testnet, Chain ID `7794095`):

* **Decentralized Ephemeral Journal:** When a transaction is submitted to the ERC-8421 alternative mempool, the client writes the leaf channel reservation to the `qframe.leaf-journal` schema on Arkiv with an automatic **10-minute native TTL** (`ExpirationTime.fromMinutes(10)`).
* **Self-Healing Abandonment Pruning:** If a transaction is dropped or abandoned in the mempool without being mined, Arkiv's native block-time expiration automatically prunes the record, releasing the leaf channel without any centralized server or cron worker.
* **Writer Wallet Address:** `0x2644Dd7905bE00422BBc79aF4E158993031fe9Ed`
* **Arkiv Diagnostic Query (Run via CLI):**
  ```bash
  node web/scripts/test-arkiv.js
  ```
* **Arkiv Track Submission Documents:**
  - [`arkiv/schema.md`](./arkiv/schema.md) — Entity schema, fields, ownership, and expiration rules.
  - [`arkiv/why-arkiv.md`](./arkiv/why-arkiv.md) — Architectural analysis: Why Arkiv DB-chain with TTL beats PostgreSQL and prevents OTS key collisions.
  - [`arkiv/how-you-use-arkiv.md`](./arkiv/how-you-use-arkiv.md) — Indexed filters, permissions, and UI visibility.
  - [`arkiv/reach.md`](./arkiv/reach.md) — Target users, ecosystem reach, and post-Mumbai roadmap.
  - [`arkiv/friction.md`](./arkiv/friction.md) — Detailed developer feedback and friction log for `@arkiv-network/sdk`.
  - [`arkiv/feedback.md`](./arkiv/feedback.md) — Formal developer experience report and improvement suggestions.

---

## Production SDK & Independent Verification App

* **Package:** `q-frame-sdk` (v0.1.1)
* **SDK Source:** [`sdk/`](./sdk/)
* **Independent Consumer App:** [`test-consumer-app/`](./test-consumer-app/) running on `http://localhost:3001`
* **Features Exported:**
  * `LeafManager` (EIP-8250 2D Keyed Nonce allocation, Write-Ahead Journal, Zero-State Recovery)
  * Native Arkiv DB-Chain integration (`syncWithArkiv()`, `publishToArkiv()`)
  * Cryptographic Safe Fee Bumping (burning exposed OTS keys)
  * Mempool Gas Admission Routing (Canonical 100k vs Alt-Mempool 2M)

---

## Scientific Citations & Author Credits

* **NIST FIPS 205 (SLH-DSA / SPHINCS+)**: David Cooper, Daniel Apon, Ray Perlner, Angela Robinson, Carl Miller (NIST) · SPHINCS+ Designers: Jean-Philippe Aumasson, Daniel J. Bernstein, Ward Beullens, Christoph Dobraunig, Maria Eichlseder, Scott Fluhrer, Stefan Kölbl, Peter Schwabe et al.
* **EIP-8141 (Frame Transactions)**: Vitalik Buterin, Yoav Weiss, Alex Forshtat, Dror Tirosh, Shahaf Nacson.
* **ERC-8421 & Ethrex Client**: Federico Carrone & LambdaClass Team · Ethereum Foundation Research.
* **Arkiv DB-Chain & EIP-8250**: Arkiv Network Architecture Team · Golem Factory.
* **ETHGlobal Submission Details:** [`SUBMISSION.md`](./SUBMISSION.md)

---

## AI Disclosure

In accordance with ETHGlobal hackathon submission guidelines: Generative AI tools (Claude 3.7 Sonnet and Antigravity) were utilized for Next.js frontend component scaffolding, test boilerplate generation, and ASCII diagram formatting. The smart contracts, Foundry benchmark assertions, gas curve derivations, and EIP-8250 keyed-nonce architectural designs were conceptualized and validated directly by the project team.
