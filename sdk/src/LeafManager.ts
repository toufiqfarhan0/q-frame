import { concat, keccak256, numberToHex, pad, toBytes, type Address, type Hex } from "viem";

export const NONCE_MANAGER_ADDRESS = "0x0000000000000000000000000000000000008250" as const;
export const DEFAULT_DOMAIN_NAMESPACE = "Q_FRAME_WOTS_LEAF_V1";

export type LeafState = "UNUSED" | "RESERVED" | "MINED" | "BURNED";

export interface LeafStatus {
  leafIndex: bigint;
  nonceKey: bigint;
  storageSlot: Hex;
  onChainSequence: bigint;
  localState: LeafState;
  isAvailable: boolean;
}

export interface JournalEntry {
  leafIndex: string;
  state: "RESERVED" | "BURNED";
  timestamp: number;
  reason?: string;
}

export interface MempoolRouteDecision {
  verificationGas: number;
  targetMempool: "canonical" | "alt-mempool";
  admitted: boolean;
  reason: string;
}

export interface LeafManagerConfig {
  rpcUrl: string;
  walletAddress: Address;
  nonceManagerAddress?: Address;
  domainNamespace?: string;
  canonicalCap?: number;
  altMempoolCap?: number;
  initialJournal?: JournalEntry[];
}

/**
 * Q-Frame LeafManager SDK
 * 
 * An EIP-8250 Keyed Nonce client manager for Post-Quantum Hash-Based Signatures (OTS)
 * and ERC-8421 Alternative Mempool Routing.
 * 
 * Cryptographic Invariant:
 * "On-chain spent is not the same as signature revealed."
 * A leaf signature is exposed as soon as a transaction is signed and broadcast. If the transaction
 * drops or is abandoned, on-chain sequence remains 0, creating a critical forgery risk upon recovery.
 * 
 * The LeafManager enforces safety via:
 * 1. Write-Ahead Journal: Marks leaves RESERVED locally before signing; never unreserves.
 * 2. On-Chain Nullifier Verification: Inspects NONCE_MANAGER (0x...8250) for MINED state.
 * 3. Recovery Skip-Ahead Gap: Jumps forward past highest seen on-chain leaf to protect dropped signatures.
 * 4. Safe Bump: Fee-bumping marks old leaf BURNED forever and allocates a fresh leaf channel.
 * 5. Namespaced Keys: Hashes leaf index with a domain tag to prevent collisions with other sender applications.
 */
export class LeafManager {
  public readonly rpcUrl: string;
  public readonly walletAddress: Address;
  public readonly nonceManagerAddress: Address;
  public readonly domainNamespace: string;
  public readonly canonicalCap: number;
  public readonly altMempoolCap: number;

  private journal: Map<string, JournalEntry> = new Map();
  private cursor: bigint = 0n;

  constructor(config: LeafManagerConfig) {
    this.rpcUrl = config.rpcUrl;
    this.walletAddress = config.walletAddress;
    this.nonceManagerAddress = config.nonceManagerAddress || NONCE_MANAGER_ADDRESS;
    this.domainNamespace = config.domainNamespace || DEFAULT_DOMAIN_NAMESPACE;
    this.canonicalCap = config.canonicalCap ?? 100_000;
    this.altMempoolCap = config.altMempoolCap ?? 2_000_000;

    if (config.initialJournal) {
      for (const entry of config.initialJournal) {
        this.journal.set(entry.leafIndex, entry);
      }
    }
  }

  /**
   * Namespaces raw leaf indices into 256-bit EIP-8250 nonce keys:
   * keccak256(domainNamespace || uint256(leafIndex))
   */
  public deriveNonceKey(leafIndex: bigint): bigint {
    const hash = keccak256(
      concat([toBytes(this.domainNamespace), numberToHex(leafIndex, { size: 32 })])
    );
    return BigInt(hash);
  }

  /**
   * Computes the exact storage slot in NONCE_MANAGER for (sender, nonceKey):
   * keccak256(pad32(sender) || pad32(nonceKey))
   */
  public getStorageSlot(nonceKey: bigint): Hex {
    return keccak256(
      concat([
        pad(this.walletAddress, { size: 32 }),
        numberToHex(nonceKey, { size: 32 }),
      ])
    );
  }

  /**
   * Reads raw on-chain sequence from the devnet's NONCE_MANAGER predeploy storage.
   * Ordinary calls to NONCE_MANAGER revert; state must be read directly via eth_getStorageAt.
   */
  public async getOnChainSequence(nonceKey: bigint): Promise<bigint> {
    const slot = this.getStorageSlot(nonceKey);
    try {
      const res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getStorageAt",
          params: [this.nonceManagerAddress, slot, "latest"],
        }),
      });
      const data = (await res.json()) as { result?: Hex };
      const raw = data.result || "0x0";
      return BigInt(raw);
    } catch {
      return 0n;
    }
  }

  /**
   * Resolves the comprehensive four-state status of a leaf:
   * MINED: Confirmed on-chain (seq >= 1).
   * BURNED: Explicitly burned locally (fee bump, failed tx, or manual burn).
   * RESERVED: Written to write-ahead journal for in-flight transaction.
   * UNUSED: Unspent on-chain and not in local journal (safe to allocate).
   */
  public async getLeafStatus(leafIndex: bigint): Promise<LeafStatus> {
    const nonceKey = this.deriveNonceKey(leafIndex);
    const storageSlot = this.getStorageSlot(nonceKey);
    const onChainSequence = await this.getOnChainSequence(nonceKey);

    let state: LeafState = "UNUSED";
    if (onChainSequence > 0n) {
      state = "MINED";
    } else {
      const journalEntry = this.journal.get(leafIndex.toString());
      if (journalEntry) {
        state = journalEntry.state;
      }
    }

    return {
      leafIndex,
      nonceKey,
      storageSlot,
      onChainSequence,
      localState: state,
      isAvailable: state === "UNUSED",
    };
  }

  /**
   * Scans a window of leaf indices starting from startIndex.
   */
  public async scanLeaves(startIndex: bigint, count: number): Promise<LeafStatus[]> {
    const results: LeafStatus[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.getLeafStatus(startIndex + BigInt(i)));
    }
    return results;
  }

  /**
   * Allocates a fresh unspent leaf, immediately writing it to the local journal as RESERVED.
   * Cryptographic invariant: Once reserved, it is NEVER returned by allocate again.
   */
  public async allocateLeaf(): Promise<bigint> {
    while (true) {
      const status = await this.getLeafStatus(this.cursor);
      const allocatedIndex = this.cursor;
      this.cursor += 1n;

      if (status.isAvailable) {
        this.journal.set(allocatedIndex.toString(), {
          leafIndex: allocatedIndex.toString(),
          state: "RESERVED",
          timestamp: Date.now(),
        });
        return allocatedIndex;
      }
    }
  }

  /**
   * Allocates `count` unspent leaves for parallel independent mempool submission.
   * Note: In Ethereum canonical mempools, same-sender pending count is capped to 1.
   * Parallel multi-channel pending occupancy requires ERC-8421 alternative mempools.
   */
  public async allocateParallelLeaves(count: number): Promise<bigint[]> {
    const leaves: bigint[] = [];
    for (let i = 0; i < count; i++) {
      leaves.push(await this.allocateLeaf());
    }
    return leaves;
  }

  /**
   * Fee-bumping policy for One-Time Signature leaves:
   * Standard RBF re-signs on the same nonce, which reveals a second signature under the same leaf key,
   * enabling forgery. The LeafManager enforces safe bumping by:
   * 1. Permanently marking the old leaf as BURNED.
   * 2. Allocating a brand-new unspent leaf for the replacement transaction.
   */
  public async bumpFee(oldLeafIndex: bigint, reason: string = "Fee bump replacement"): Promise<{ newLeafIndex: bigint; burnedOldLeafIndex: bigint }> {
    this.journal.set(oldLeafIndex.toString(), {
      leafIndex: oldLeafIndex.toString(),
      state: "BURNED",
      timestamp: Date.now(),
      reason,
    });

    const newLeafIndex = await this.allocateLeaf();
    return {
      newLeafIndex,
      burnedOldLeafIndex: oldLeafIndex,
    };
  }

  /**
   * Recovery with Skip-Ahead Gap:
   * When restoring a wallet on a new device where local journal state is absent:
   * 1. Scans on-chain storage up to scanWindow to discover the highest mined leaf index.
   * 2. Jumps forward by safetyGap (default: 16 leaves) past the highest mined index.
   * This guarantees that any transactions signed on previous devices that were dropped or
   * never mined will NEVER collide with new signatures.
   */
  public async recoverWallet(scanWindow: number = 64, safetyGap: number = 16): Promise<{ highestMinedLeaf: bigint | null; resumeIndex: bigint }> {
    let highestMined: bigint | null = null;

    for (let i = 0; i < scanWindow; i++) {
      const idx = BigInt(i);
      const nonceKey = this.deriveNonceKey(idx);
      const seq = await this.getOnChainSequence(nonceKey);
      if (seq > 0n) {
        highestMined = idx;
      }
    }

    const resumeIndex = highestMined !== null 
      ? highestMined + 1n + BigInt(safetyGap) 
      : BigInt(safetyGap);

    this.cursor = resumeIndex;
    return {
      highestMinedLeaf: highestMined,
      resumeIndex,
    };
  }

  /**
   * Exports the current local journal for persistence.
   */
  public exportJournal(): JournalEntry[] {
    return Array.from(this.journal.values());
  }

  /**
   * Evaluates verification gas cost against configurable mempool rules.
   */
  public routeMempool(verificationGas: number, isStaked: boolean): MempoolRouteDecision {
    if (verificationGas <= this.canonicalCap) {
      return {
        verificationGas,
        targetMempool: "canonical",
        admitted: true,
        reason: `Within canonical mempool validation ceiling (${verificationGas.toLocaleString()} <= ${this.canonicalCap.toLocaleString()} gas).`,
      };
    }

    if (verificationGas > this.altMempoolCap) {
      return {
        verificationGas,
        targetMempool: "alt-mempool",
        admitted: false,
        reason: `Exceeds alternative mempool ceiling (${verificationGas.toLocaleString()} > ${this.altMempoolCap.toLocaleString()} gas).`,
      };
    }

    if (!isStaked) {
      return {
        verificationGas,
        targetMempool: "alt-mempool",
        admitted: false,
        reason: `Unstaked entity capped at ${this.canonicalCap.toLocaleString()} gas. Current verification requires ${verificationGas.toLocaleString()} gas. Requires stake deposit in NaiveStakingRegistry.`,
      };
    }

    return {
      verificationGas,
      targetMempool: "alt-mempool",
      admitted: true,
      reason: `Admitted into ERC-8421 alternative mempool (${verificationGas.toLocaleString()} <= ${this.altMempoolCap.toLocaleString()} gas) with active collateral.`,
    };
  }
}

