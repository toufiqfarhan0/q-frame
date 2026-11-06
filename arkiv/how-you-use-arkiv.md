# How Q-Frame Uses Arkiv

## 1. Do Filters, Permissions, and Expirations Fit What We Do?

Yes, every architectural primitive in our Arkiv integration directly mirrors the cryptographic constraints of Post-Quantum One-Time Signatures (OTS) and EIP-8250 Keyed Nonces:

### A. Indexed Attribute Filtering (`where(eq("wallet", addr(userAddress)))`)
* **The Need:** When a user opens the LeafManager Studio, the client needs an instant index lookup of *only their own* reservations out of the global mempool pool.
* **The Implementation:** We declare `wallet: addr().indexed()` and `leafIndex: dec().indexed()`. This allows queries to execute via indexed lookups on Rabdi RPC rather than performing costly full-table scans.

### B. Ownership Model (`$owner`)
* **The Need:** An attacker must never be able to delete or tamper with another user's leaf reservations, as spoofing a `BURN` action could trick a client into re-using a compromised leaf.
* **The Implementation:** Only the transaction sender (`$owner`) possesses the authorization to mutate or extend their reservations. Other users can only read them.

### C. 10-Minute Expiration Window (`ExpirationTime.fromMinutes(10)`)
* **The Need:** Mempool transactions in alternative ERC-8421 networks have a finite lifespan. If a transaction is not picked up by miners within 10 minutes (approx. 300 blocks), it is considered dropped.
* **The Implementation:** Rather than requiring complex client-side garbage collection or orphan detection, Arkiv automatically prunes the record. When the client refreshes, expired reservations disappear from the query result, safely recycling the leaf channel to `UNUSED`.

---

## 2. Does Each Arkiv Feature Change Something Users See?

Every feature of Arkiv actively changes the interactive UI in the **LeafManager Studio**:

1. **Live "Arkiv DB-Chain" Status Counter:**
   * The live context bar displays the exact number of active time-scoped entities currently registered on Rabdi testnet for their account.
2. **Interactive Arkiv Query & Expiration Inspector:**
   * In Tab 5 (*5. ARKIV*), clicking **"Query Entities"** executes a live RPC query using `publicClient.select().from(LeafReservation).where(...)`. Users see their on-chain entity keys, channel IDs, action types, and block expiration counters in real time.
3. **Commit with 10m TTL Button:**
   * Users can select any leaf channel (0..11) and click **"Commit (10m TTL)"**. This dispatches `walletClient.createEntity(...)` to Rabdi Testnet with `ExpirationTime.fromMinutes(10)`.
4. **MetaMask Rabdi Network Switcher:**
   * Includes a 1-click `wallet_addEthereumChain` / `wallet_switchEthereumChain` modal that automatically configures MetaMask for Arkiv Rabdi Testnet (`0x76edaf`), accompanied by a direct link to claim testnet `tGLM` from the official faucet.

