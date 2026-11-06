# Arkiv Network Developer Feedback & Improvement Report

**Project:** Q-FRAME (ETHGlobal Mumbai 2026)  
**Track:** Best use of Arkiv DB-Chain  
**Tested Stack:** `@arkiv-network/sdk` v1.0.1 on Rabdi Testnet (Chain ID `7794095`, `0x76edaf`)  
**RPC Endpoint:** `https://rpc.rabdi.db-chain.testnet.arkiv.network`  
**Block Explorer:** `https://rabdi.explorer.arkiv.network`  

---

## 1. Executive Summary & What Worked Brilliantly

Q-FRAME integrates Arkiv DB-Chain as a decentralized, ephemeral **Write-Ahead Journal** for post-quantum hash-based signatures (NIST FIPS 205 / Winternitz OTS).

### What We Loved About Arkiv:
1. **Native Expiring Entities (TTLs)**:  
   Arkiv's native `ExpirationTime.fromMinutes(10)` (300 blocks on Rabdi) solved our biggest architectural challenge. In post-quantum systems, dropped mempool transactions risk abandoning leaf channel reservations forever. With Arkiv, dropped reservations self-prune automatically at block `landingBlock + 300` without needing a central coordinator or manual cleanup bot.
2. **Type-Safe Schemas**:  
   Defining `defineSchema("qframe.leaf-journal", { ... })` with typed constructors (`addr`, `dec`, `str`) felt ergonomic and familiar to TypeScript developers.
3. **Gasless Queries via Public Client**:  
   Querying live active entities via `client.select().from(LeafReservation).where(eq("wallet", addr(...))).fetch()` executed fast and gaslessly, allowing our frontend to maintain zero backend database dependency.
4. **Rich Block Explorer**:  
   The Rabdi explorer provided instant visual confirmation of entity creation, indexed attributes, owner addresses, and precise remaining lifetime percentages.

---

## 2. Friction Points & Constructive DX Feedback

During our hackathon integration, we documented four actionable areas where developer experience can be improved:

### A. Subpath Export Ambiguity for Query Operators
* **Observed Friction:**  
  Common quickstart patterns led developers to attempt:
  ```typescript
  import { eq } from "@arkiv-network/sdk"; // undefined at runtime
  ```
  In `@arkiv-network/sdk` v1.0.1, `eq` is only available from `@arkiv-network/sdk/query`.
* **Recommendation:**  
  Re-export query operators (`eq`, `and`, `or`, `gt`, `gte`, `lt`, `lte`) directly from the package root so developers do not encounter runtime errors when writing filters.

---

### B. Injected Browser Wallet (MetaMask) Gas Estimation on Rabdi
* **Observed Friction:**  
  When using `createWalletClient({ transport: custom(window.ethereum) })` on Rabdi, calling `walletClient.createEntity(...)` without explicit gas parameters frequently causes MetaMask simulation to fail with:
  ```
  ContractFunctionExecutionError: Execution error without revert data
  ```
* **Solution We Implemented:**  
  Following the official `arkiv-write-safety` and `browser-wallet` guidelines, we passed explicit transaction options:
  ```typescript
  await walletClient.createEntity(schema, values, { expiration }, {
    gas: 1000000n,
    gasPrice: 1000000000n // 1 gwei
  });
  ```
* **Recommendation:**  
  Provide built-in fallback gas defaults within `walletClient.createEntity` for browser wallets, so hackathon developers don't need to manually configure the 1M gas floor.

---

### C. Node.js LocalStorage Warning in Server Actions
* **Observed Friction:**  
  When running queries in Node.js 22+ or Next.js server actions, the SDK outputs:
  ```
  (node:xxxx) Warning: `--localstorage-file` was provided without a valid path
  ```
* **Recommendation:**  
  Wrap storage detection logic in a server-runtime check (`typeof window !== 'undefined'`) to avoid Node.js experimental flag warnings.

---

### D. Programmatic Faucet API for Automated Testing
* **Observed Friction:**  
  The Hub faucet at `https://hub.arkiv.network/faucet` requires interactive browser SIWE sign-in. While effective against Sybil attacks, it blocks headless CI/CD test runners and local development automation from acquiring `tGLM`.
* **Recommendation:**  
  Offer a rate-limited faucet API endpoint authenticated via an Arkiv Hub Access Key (`X-API-KEY: <key>`) for verified developer accounts.

---

## 3. Verified Live Proof on Rabdi Testnet

Q-FRAME successfully submitted and verified multiple live entities on Arkiv Rabdi Testnet:

* **Entity Key:** `0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d`  
* **Schema:** `qframe.leaf-journal`  
* **Owner:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`  
* **Target Wallet:** `0xd886168001663855a8f1ea7DdEa1393A074Ee354`  
* **Attributes:** `action: "RESERVE"`, `leafIndex: 4`, `nonceKey: "0x453b8782..."`, `status: "PENDING_MEMPOOL"`  
* **Created Block:** `309807`  
* **Expiration Block:** `310107` (10-minute / 300-block native TTL)  
* **Explorer Link:** [View on Arkiv Rabdi Explorer](https://rabdi.explorer.arkiv.network/search?q=0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d)

---

## 4. Final Verdict

Arkiv DB-Chain is a transformative infrastructure layer for Web3. By treating state as time-scoped, queryable, and decentralized, it allowed Q-FRAME to implement a zero-server, multi-device post-quantum nonce coordinator that would be impossible with traditional smart contracts or centralized databases alone.
