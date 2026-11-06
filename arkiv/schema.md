# Arkiv DB-Chain Entity Schema Specification

**Application Namespace:** `qframe.leaf-journal`  
**Network:** Arkiv Rabdi Testnet (Chain ID `7794095`)  
**SDK Package:** `@arkiv-network/sdk` v0.1.0  

---

## 1. Entity Overview: `LeafReservation`

The `qframe.leaf-journal` schema records ephemeral, time-scoped state for post-quantum One-Time Signature (OTS) leaf channels. In stateful quantum-resistant signature schemes (such as Winternitz OTS and SPHINCS+ / NIST FIPS 205), signing twice with the same key exposes hash preimages and forfeits the entire account. 

Because client wallets may operate concurrently across multiple devices (e.g. desktop browser, mobile phone, automated relayer daemon), ephemeral leaf allocations must be decentralized, verifiable, and automatically cleaned up if a transaction is abandoned.

```typescript
import { defineSchema, str, addr, dec } from "@arkiv-network/sdk/schema";

export const LeafReservation = defineSchema("qframe.leaf-journal", {
  wallet: addr().indexed(),
  leafIndex: dec().indexed(),
  nonceKey: str().indexed(),
  action: str().indexed(), // "RESERVE" | "BURN" | "COMMIT"
  status: str(),           // "PENDING_MEMPOOL" | "MINED" | "SUPERSEDED"
});
```

---

## 2. Field Definitions

| Field Name | Type | Indexed? | Description |
| :--- | :--- | :--- | :--- |
| `wallet` | `addr` | **Yes** | The Ethereum address of the smart account owner requesting leaf channels. |
| `leafIndex` | `dec` | **Yes** | The 0-indexed leaf in the post-quantum Winternitz hash tree (0..11). |
| `nonceKey` | `str` | **Yes** | 256-bit EIP-8250 nonce domain key derived deterministically as `keccak256("qframe.ots.leaf", leafIndex)`. |
| `action` | `str` | **Yes** | The lifecycle event: `RESERVE` (allocated in alt-mempool), `BURN` (destroyed via safe fee bump), or `COMMIT` (mined). |
| `status` | `str` | No | Current operational status: `PENDING_MEMPOOL`, `MINED`, or `SUPERSEDED`. |

---

## 3. Ownership & Access Control

* **Entity Creator / Owner:** Every entity is created and owned by the user's wallet address (`$owner = msg.sender`).
* **Mutation Rights:** Only the owner wallet can patch, extend, or delete an entity.
* **Public Visibility:** All entities are publicly queryable on the Arkiv Rabdi DB-Chain, enabling any device or relayer node authorized by the user to inspect pending mempool reservations before signing.

---

## 4. Expiration Policy & Time-To-Live (TTL)

* **Creation Lifespan:** `ExpirationTime.fromMinutes(10)` (approx. 300 blocks on Rabdi testnet).
* **Why Expiration is Critical:**  
  When an ERC-8421 alternative mempool transaction is broadcast, it may fail to mine if base fees surge or if the relayer drops it. In traditional systems, abandoned local reservations permanently block leaf channels.  
  On Arkiv, once the 10-minute deadline passes without an on-chain inclusion proof, **Arkiv automatically prunes the entity**. The `@qframe/sdk` detects that the reservation expired and safely reclaims the leaf channel into `UNUSED` status.

