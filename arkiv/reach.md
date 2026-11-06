# Reach & Ecosystem Viability: Q-Frame on Arkiv

## 1. Who Is It For, and Would They Use It?

### Primary Audiences:
1. **Post-Quantum Smart Account Developers:**  
   As NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA) are adopted, Ethereum account abstraction (EIP-7702, EIP-8141) will shift from elliptic curves (ECDSA) to hash-tree and lattice signatures. Any team building a stateful post-quantum wallet requires an ephemeral journal to prevent key reuse across devices. Arkiv provides the exact decentralized storage layer they need.

2. **Alternative Mempool Operators & Searchers (ERC-8421):**  
   Bundlers, relayers, and searchers running heavy validation workloads (>100k gas) need to coordinate mempool commitments without relying on a centralized RPC choke point. By using Arkiv's time-scoped entities, relayers can verify mempool key reservations permissionlessly.

### Why They Would Use It:
* Zero infrastructure setup: No Postgres database to deploy, scale, backup, or monitor.
* Pure Web3 UX: Signed directly with existing Ethereum wallet credentials.
* Automatic TTL: Avoids stale mempool data accumulation forever.

---

## 2. Can They Try It Today?

**Yes, live right now during ETHGlobal Mumbai:**
* **Live Studio Interface:** Navigate to [`/studio`](https://qframe.network/studio or `http://localhost:3000/studio`), select **Tab 5 (ARKIV)**, and interact directly with live Arkiv entities.
* **Arkiv Rabdi Testnet RPC:** Connected to `https://rpc.rabdi.db-chain.testnet.arkiv.network` (Chain ID `7794095`).
* **Verified Contract Deployments on Devnet:** Keyed nonces tested live on Hegotá Devnet predeploy `0x0000000000000000000000000000000000008250`.

---

## 3. Will We Keep Building It After Mumbai?

**Yes.** The roadmap following ETHGlobal Mumbai includes:
1. **Arkiv-Backed SDK Package Release:** Packaging the Arkiv Ephemeral Journal adapter directly into the published `@qframe/sdk` npm package as `@qframe/sdk/arkiv`.
2. **Mainnet Arkiv Deployment:** Migrating from Rabdi testnet to Arkiv mainnet as soon as production DB-chains go live.
3. **EIP Standardization:** Submitting our findings on ephemeral mempool coordination with TTL to the Ethereum Foundation's ERC-8421 working group.

