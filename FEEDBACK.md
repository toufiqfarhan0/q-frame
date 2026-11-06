# FEEDBACK: EIP-8141 & ERC-8421 Devnet Developer Experience

Feedback compiled during ETHGlobal Mumbai for the Ethereum Foundation Access Layer team (Alex Forshtat, Pierre, and Yoav Weiss).

---

## 1. Time to First Success
- **Clone to Test Execution**: Under 5 minutes once `forge-std` was installed.
- **Foundry Compatibility**: Compiling with `via_ir = true` on `cancun` EVM succeeded cleanly with `@forshtat/hegota-support`.
- **EIP-8141 Wire Codec**: The TypeScript frame serializer (`@forshtat/hegota-support/tx`) correctly generated RLP envelopes for Type `0x06` transactions.

---

## 2. Friction Encountered

### 1. Windows Path Delimiters
* `test/lib/config.test.ts` assumed POSIX path separators (`endsWith("/.workshop-state.json")`).
* On Windows, `path.resolve` produced `\.workshop-state.json`, causing the test suite to fail until normalized with `replace(/\\/g, '/')`.

### 2. Devnet Gateway Faucet Availability
* When calling `step_1_check`, the live gateway faucet (`altmempoolgateway.forshtat.com`) returned:
  `[FUNDING_FAILED] The faucet refused: The faucet is empty`.
* Switching to the Hegotá Ethrex Devnet faucet (`https://faucet.hegota.ethrex.xyz/api/claim`) successfully provided 1.0 ETH per IP/hour, which unblocked contract deployment.

### 3. State Gas Surcharge on Account Creation
* Deploying contract accounts on the devnet incurs a state gas surcharge (~183,600 gas per allocated storage slot).
* A standard 900,000 gas limit reverted during deployment; setting `deployGasLimit: 6000000` (6M gas) was required for `PQBenchmarkAccount` (which deploys 7 internal helper contracts via `HegotaSupport`).

---

## 3. Discrepancies: Specification vs Live Nodes

### 1. Verification Gas Caps (100k/1M vs 250k/2.5M)
* **Docs Draft Specification:** Mentions `MAX_VERIFY_GAS = 100,000` and `MAX_VERIFY_GAS_PER_ENTITY = 1,000,000`.
* **Workshop Landing Page:** References `250,000` canonical and `2,500,000` alt-mempool limits.
* **Empirical Live Finding:** The sidecar node currently enforces the 100k / 1M boundaries. Reconciling the landing page copy with the live sidecar configuration will prevent builder confusion.

### 2. Storage Rule Enforcement Under Staking
* When an account is staked, ERC-8421 relaxes storage rules. However, the exact error messages emitted when an unstaked entity attempts dynamic storage vs when gas exceeds the 100k cap were occasionally identical (`Rejection: StorageRuleViolation`). Differentiating error codes (e.g. `ERR_GAS_CEILING` vs `ERR_UNSTAKED_STORAGE`) improves client-side diagnostics.

---

## 4. Architectural Contribution: EIP-8250 Keyed Nonces for Hash-Based Signatures

During our implementation of `PQBenchmarkAccount`, we uncovered a fundamental interaction between Post-Quantum One-Time Signatures (OTS) and mempool transaction replacement:

* **The Problem:** Hash-based one-time signature schemes (WOTS+, SPHINCS+) become insecure if an OTS key signs more than once. When a transaction requires a fee-bump (Replace-By-Fee), re-signing with higher fees exposes a second signature under the same leaf, allowing an adversary to forge signatures.
* **The Solution:** The Hegotá devnet natively provides **EIP-8250 Keyed Nonces** via `NONCE_MANAGER` (`0x...8250`).
* **The Design:** By mapping each OTS leaf index directly to an EIP-8250 `nonceKey` ($\text{nonceKey} = \text{leafIndex}$), transactions on different leaves can sit concurrently in the mempool side-by-side without queue serialization bottlenecks (`step_12_tx_keyed_nonces`). Monotonic advancement on each channel prevents replay attacks at the mempool layer.

---

## 5. Live On-Chain Evidence References

* **Contract Address:** [`0xe5c5A34833db3A90E30adCD98f2955E36496483B`](https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B)
* **Deployment Transaction:** [`0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36`](https://dora.hegota.ethrex.xyz/tx/0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36) (Block `#1317596`)
* **Alt-Mempool Explorer:** [`https://explorer.altmempool.wtf/`](https://explorer.altmempool.wtf/)
* **Dora Devnet Explorer:** [`https://dora.hegota.ethrex.xyz/`](https://dora.hegota.ethrex.xyz/)
