# Arkiv Integration Feedback & Friction Log

**Project:** Q-FRAME (ETHGlobal Mumbai 2026)  
**Package:** `@arkiv-network/sdk` v0.1.0  
**Testnet:** Rabdi (Chain ID `7794095`)  

---

## 1. What Got in Our Way & What Should Be Improved

### A. Subpath Export Confusion for Query Operators (`eq`, `and`, `or`)
* **The Friction:**  
  The documentation examples and quickstarts suggest importing `eq` directly from `@arkiv-network/sdk`:
  ```typescript
  import { eq } from "@arkiv-network/sdk"; // => undefined!
  ```
  However, in `@arkiv-network/sdk` v0.1.0, `eq` is only exported from the subpath `@arkiv-network/sdk/query`.
* **Improvement Request:**  
  Re-export query operators (`eq`, `and`, `or`, `gt`, `gte`, `lt`, `lte`) from the root package export `@arkiv-network/sdk` so developers don't encounter subtle `undefined` runtime errors when constructing filters.

---

### B. Node.js LocalStorage Warning in Server Runtimes
* **The Friction:**  
  When running queries in Node.js 22+ or Next.js server actions / API routes, `@arkiv-network/sdk` triggers:
  ```
  (node:1522) Warning: `--localstorage-file` was provided without a valid path
  ```
* **Improvement Request:**  
  Guard the debug logger / storage detection check in `logger.ts` so that it doesn't trigger Node.js experimental feature warnings when executed inside standard server runtimes.

---

### C. Faucet Automation & Programmatic Developer Experience
* **The Friction:**  
  The current faucet at `https://hub.arkiv.network/faucet` requires interactive browser SIWE authentication. While effective at deterring bot attacks, it makes headless CI/CD test runs and local developer scripting difficult.
* **Improvement Request:**  
  Provide a rate-limited programmatic faucet endpoint accessible with an Arkiv Developer Access Key (`X-API-KEY: <key>`), allowing hackathon CLI scripts and automated testing harnesses to fund disposable test accounts automatically.

---

## 2. Issues Encountered & Reproductions

### Issue: Unhandled Revert on Empty Balance During `createEntity`
* **What Happened:**  
  When an account with 0 `tGLM` calls `walletClient.createEntity(...)`, the call rejected with a generic message:
  ```
  Transaction failed: Execution error without revert data
  ```
* **What We Expected:**  
  A friendly, actionable pre-flight error such as:
  ```
  InsufficientFundsError: Account 0x... has 0 tGLM. Gas cost requires at least 0.0001 tGLM on Rabdi testnet. Claim testnet tokens at https://hub.arkiv.network/faucet.
  ```
* **Reproduction Code:**
  ```typescript
  import { createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
  import { rabdi } from "@arkiv-network/sdk/chains";
  import { http } from "viem";
  import { privateKeyToAccount } from "viem/accounts";

  const client = createWalletClient({
    chain: rabdi({ accessKey: "" }),
    transport: http(),
    account: privateKeyToAccount("0x...unfunded_key..."),
  });

  await client.createEntity(schema, values, { expiration: ExpirationTime.fromMinutes(10) });
  // Throws "Execution error without revert data" instead of InsufficientFundsError
  ```

---

## 3. The One Improvement with Greatest Impact

**Interactive Schema Explorer & Webhook Subscriptions in Arkiv Hub:**  
Allowing developers to visually browse registered schemas in the Arkiv Hub web UI, inspect active entities across namespaces, and subscribe to WebSocket events (or webhooks) when an entity is created or expires. This would make building multi-agent coordination systems effortless.

