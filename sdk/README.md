# Q-Frame SDK (`@toufiqfarhan0/q-frame-sdk`)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Client SDK for **Post-Quantum Frame Transactions** utilizing **EIP-8250 Keyed Nonces** and **ERC-8421 Staked Alternative Mempools**.

---

## The Problem: OTS & Nonce Reuse

Post-Quantum hash-based signatures (e.g. Winternitz One-Time Signatures / WOTS+ and FORS) expose parts of their private key with every signature. **A leaf key can only be used once**. Revealing two signatures under the same leaf allows attackers to forge transactions.

Traditional accounts rely on linear nonces ($0, 1, 2, \dots$), which forces serialization and makes fee-bumping (RBF) fatal for one-time signatures: fee-bumping re-signs the same nonce with higher priority fees, producing a second signature for that leaf.

Furthermore:
> **"On-chain spent is not the same as signature revealed."**
> A leaf signature is made public as soon as a transaction is signed and broadcast. If the transaction drops or is abandoned, on-chain sequence remains $0$, creating a critical forgery risk upon wallet recovery if the client naïvely reuses the lowest unspent on-chain index.

---

## The Solution: EIP-8250 Keyed Nonces + LeafManager

`@toufiqfarhan0/q-frame-sdk` provides the `LeafManager`, an abstraction enforcing strict cryptographic invariants:

1. **Write-Ahead Journal**: Marks leaf channels `RESERVED` locally *before* signing. Once reserved, a leaf is never re-allocated even if the transaction drops.
2. **On-Chain Nullifier Verification**: Reads the Ethereum Foundation's `NONCE_MANAGER` predeploy (`0x...8250`) via direct `eth_getStorageAt` reads.
3. **Safe Fee-Bumping (`bumpFee`)**: Permanently marks the old leaf as `BURNED` and immediately allocates a brand-new leaf channel for the replacement transaction.
4. **Zero-State Recovery with Skip-Ahead Gap (`recoverWallet`)**: Discovers the highest mined leaf on-chain and advances by a configurable `safetyGap` (default: 16 leaves) to protect dropped/unmined historical signatures.
5. **Namespaced EIP-8250 Nonce Keys**: Computes $\text{keccak256}(\text{domain} \parallel \text{leafIndex})$ to prevent key collisions across multiple applications sharing the same sender.
6. **Mempool Routing Engine**: Evaluates post-quantum verification gas against canonical limits ($100\text{k}$) and ERC-8421 staked alternative mempool limits ($2\text{M}$).

---

## Installation

```bash
npm install @toufiqfarhan0/q-frame-sdk viem
# or
yarn add @toufiqfarhan0/q-frame-sdk viem
# or
pnpm add @toufiqfarhan0/q-frame-sdk viem
```

---

## Quick Start

### 1. Initialize `LeafManager`

```typescript
import { LeafManager } from "@toufiqfarhan0/q-frame-sdk";

const manager = new LeafManager({
  rpcUrl: "https://rpc1.hegota.ethrex.xyz", // Hegotá Devnet or local node
  walletAddress: "0xe5c5a31c51db316231eb93a8e999c0ec28a8483b",
  canonicalCap: 100_000,
  altMempoolCap: 2_000_000,
});
```

### 2. Allocate an Unspent Leaf Channel

```typescript
// Automatically marks leaf as RESERVED in local journal
const leafIndex = await manager.allocateLeaf();
const nonceKey = manager.deriveNonceKey(leafIndex);

console.log(`Allocated Leaf #${leafIndex} (Nonce Key: ${nonceKey})`);
```

### 3. Safe Fee-Bumping (Replace Dropped/Pending Tx)

```typescript
// Burns Leaf #0 permanently and allocates fresh Leaf #1
const bump = await manager.bumpFee(0n, "Replaced with higher priority fee");

console.log(`Burned leaf #${bump.burnedOldLeafIndex}`);
console.log(`New replacement leaf #${bump.newLeafIndex}`);
```

### 4. Zero-State Wallet Recovery

When restoring a wallet on a new device where local journal state is unavailable:

```typescript
// Scans on-chain storage for mined leaves, then jumps forward by safetyGap
const recovery = await manager.recoverWallet(64, 16);

console.log(`Highest mined leaf on-chain: ${recovery.highestMinedLeaf}`);
console.log(`Safe resume index: ${recovery.resumeIndex}`);
```

### 5. Mempool Admission Evaluation

```typescript
const decision = manager.routeMempool(324_000, true);

console.log(decision);
// {
//   verificationGas: 324000,
//   targetMempool: 'alt-mempool',
//   admitted: true,
//   reason: 'Admitted into ERC-8421 alternative mempool (324,000 <= 2,000,000 gas) with active collateral.'
// }
```

---

## API Reference

### `new LeafManager(config: LeafManagerConfig)`
- `rpcUrl: string` — JSON-RPC endpoint.
- `walletAddress: Address` — Smart wallet account address.
- `nonceManagerAddress?: Address` — Predeploy contract address (default: `0x...8250`).
- `domainNamespace?: string` — Domain separation string (default: `"Q_FRAME_WOTS_LEAF_V1"`).
- `canonicalCap?: number` — Canonical validation gas ceiling (default: `100,000`).
- `altMempoolCap?: number` — Alternative mempool validation gas ceiling (default: `2,000,000`).
- `initialJournal?: JournalEntry[]` — Hydrate local journal from stored state.

### Methods
- `deriveNonceKey(leafIndex: bigint): bigint`
- `getStorageSlot(nonceKey: bigint): Hex`
- `getOnChainSequence(nonceKey: bigint): Promise<bigint>`
- `getLeafStatus(leafIndex: bigint): Promise<LeafStatus>`
- `allocateLeaf(): Promise<bigint>`
- `allocateParallelLeaves(count: number): Promise<bigint[]>`
- `bumpFee(oldLeafIndex: bigint, reason?: string): Promise<{ newLeafIndex: bigint; burnedOldLeafIndex: bigint }>`
- `recoverWallet(scanWindow?: number, safetyGap?: number): Promise<{ highestMinedLeaf: bigint | null; resumeIndex: bigint }>`
- `routeMempool(verificationGas: number, isStaked: boolean): MempoolRouteDecision`
- `exportJournal(): JournalEntry[]`

---

## License

MIT © 2026 Toufiq Farhan

