import { concat, keccak256, numberToHex, pad, toBytes } from "viem";

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export const NONCE_MANAGER_ADDRESS: Address = "0x0000000000000000000000000000000000008250";
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

  public deriveNonceKey(leafIndex: bigint): bigint {
    const hash = keccak256(
      concat([toBytes(this.domainNamespace), numberToHex(leafIndex, { size: 32 })])
    );
    return BigInt(hash);
  }

  public getStorageSlot(nonceKey: bigint): Hex {
    return keccak256(
      concat([
        pad(this.walletAddress, { size: 32 }),
        numberToHex(nonceKey, { size: 32 }),
      ])
    );
  }

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

  public async scanLeaves(startIndex: bigint, count: number): Promise<LeafStatus[]> {
    const results: LeafStatus[] = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.getLeafStatus(startIndex + BigInt(i)));
    }
    return results;
  }

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
          reason: "Allocated parallel OTS channel",
        });
        return allocatedIndex;
      }
    }
  }

  public async allocateParallelLeaves(count: number): Promise<bigint[]> {
    const leaves: bigint[] = [];
    for (let i = 0; i < count; i++) {
      leaves.push(await this.allocateLeaf());
    }
    return leaves;
  }

  public async bumpFee(oldLeafIndex: bigint, reason: string = "Fee bump replacement"): Promise<{ newLeafIndex: bigint; burnedOldLeafIndex: bigint }> {
    this.journal.set(oldLeafIndex.toString(), {
      leafIndex: oldLeafIndex.toString(),
      state: "BURNED",
      timestamp: Date.now(),
      reason,
    });

    const newLeafIndex = await this.allocateLeaf();
    this.journal.set(newLeafIndex.toString(), {
      leafIndex: newLeafIndex.toString(),
      state: "RESERVED",
      timestamp: Date.now(),
      reason: `Safe Fee Bump replacement for burned Leaf #${oldLeafIndex}`,
    });
    return {
      newLeafIndex,
      burnedOldLeafIndex: oldLeafIndex,
    };
  }

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

  public exportJournal(): JournalEntry[] {
    return Array.from(this.journal.values());
  }

  public getJournal(): JournalEntry[] {
    return this.exportJournal();
  }

  public getCursor(): bigint {
    return this.cursor;
  }

  public setCursor(cursor: bigint): void {
    this.cursor = cursor;
  }

  public resetJournal(cursor: bigint = 0n): void {
    this.journal.clear();
    this.cursor = cursor;
  }

  public setLeafState(leafIndex: bigint, state: "RESERVED" | "BURNED", reason?: string): void {
    this.journal.set(leafIndex.toString(), {
      leafIndex: leafIndex.toString(),
      state,
      timestamp: Date.now(),
      reason,
    });
  }

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
