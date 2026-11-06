import { concat, keccak256, numberToHex, pad, type Address, type Hex } from "viem";

export const NONCE_MANAGER_ADDRESS = "0x0000000000000000000000000000000000008250" as const;

export interface LeafStatus {
  leafIndex: bigint;
  storageSlot: Hex;
  sequence: bigint;
  isSpent: boolean;
}

export interface MempoolRouteDecision {
  verificationGas: number;
  targetMempool: "canonical" | "alt-mempool";
  admitted: boolean;
  reason: string;
}

/**
 * Q-Frame LeafManager SDK
 * 
 * Lightweight client SDK for Post-Quantum accounts using EIP-8250 Keyed Nonces and ERC-8421 Alt-Mempools.
 * 
 * Features:
 * 1. Derives EIP-8250 storage slots for OTS leaf indices (nonceKey = leafIndex).
 * 2. Queries on-chain leaf consumption from the NONCE_MANAGER predeploy (0x...8250).
 * 3. Discovers the next unspent leaf index after wallet recovery without off-chain state dependencies.
 * 4. Allocates multiple independent leaf channels for parallel concurrent mempool transactions.
 * 5. Routes transactions between canonical and staked alternative mempools based on verification gas.
 */
export class LeafManager {
  public readonly rpcUrl: string;
  public readonly walletAddress: Address;
  public readonly nonceManagerAddress: Address;

  constructor(options: {
    rpcUrl: string;
    walletAddress: Address;
    nonceManagerAddress?: Address;
  }) {
    this.rpcUrl = options.rpcUrl;
    this.walletAddress = options.walletAddress;
    this.nonceManagerAddress = options.nonceManagerAddress || NONCE_MANAGER_ADDRESS;
  }

  /**
   * Computes the EIP-8250 storage slot in NONCE_MANAGER for a given sender and leaf key:
   * keccak256(pad32(sender) || pad32(key))
   */
  public getStorageSlot(leafIndex: bigint): Hex {
    return keccak256(
      concat([
        pad(this.walletAddress, { size: 32 }),
        numberToHex(leafIndex, { size: 32 }),
      ])
    );
  }

  /**
   * Queries the on-chain sequence of a leaf key via eth_getStorageAt.
   * If sequence == 0n: unspent (ready).
   * If sequence >= 1n: spent (nullified / retired).
   */
  public async getLeafStatus(leafIndex: bigint): Promise<LeafStatus> {
    const slot = this.getStorageSlot(leafIndex);
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
    const rawVal = data.result || "0x0";
    const seq = BigInt(rawVal);
    return {
      leafIndex,
      storageSlot: slot,
      sequence: seq,
      isSpent: seq > 0n,
    };
  }

  /**
   * Scans a range of leaf indices to discover on-chain state.
   */
  public async scanLeaves(startIndex: bigint, count: number): Promise<LeafStatus[]> {
    const promises: Promise<LeafStatus>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.getLeafStatus(startIndex + BigInt(i)));
    }
    return Promise.all(promises);
  }

  /**
   * Finds the lowest unspent leaf index starting from a given search point.
   */
  public async getNextAvailableLeaf(startFrom: bigint = 0n, maxSearch: number = 64): Promise<bigint> {
    for (let i = 0; i < maxSearch; i++) {
      const idx = startFrom + BigInt(i);
      const status = await this.getLeafStatus(idx);
      if (!status.isSpent) {
        return idx;
      }
    }
    throw new Error(`Exhausted search window of ${maxSearch} leaves starting from ${startFrom}.`);
  }

  /**
   * Allocates `count` unspent leaves for concurrent independent mempool submission.
   */
  public async allocateParallelLeaves(count: number, startFrom: bigint = 0n): Promise<bigint[]> {
    const allocated: bigint[] = [];
    let current = startFrom;
    while (allocated.length < count && current < startFrom + 128n) {
      const status = await this.getLeafStatus(current);
      if (!status.isSpent) {
        allocated.push(current);
      }
      current += 1n;
    }
    if (allocated.length < count) {
      throw new Error(`Could only allocate ${allocated.length} of ${count} requested leaves.`);
    }
    return allocated;
  }

  /**
   * Routes a transaction to the appropriate mempool based on verification gas and staking state.
   */
  public routeMempool(verificationGas: number, isStaked: boolean): MempoolRouteDecision {
    const CANONICAL_CAP = 100_000;
    const ALT_MEMPOOL_CAP = 2_000_000;

    if (verificationGas <= CANONICAL_CAP) {
      return {
        verificationGas,
        targetMempool: "canonical",
        admitted: true,
        reason: `Within canonical mempool limit (${verificationGas.toLocaleString()} <= 100,000 gas).`,
      };
    }

    if (verificationGas > ALT_MEMPOOL_CAP) {
      return {
        verificationGas,
        targetMempool: "alt-mempool",
        admitted: false,
        reason: `Exceeds alternative mempool ceiling (${verificationGas.toLocaleString()} > 2,000,000 gas).`,
      };
    }

    if (!isStaked) {
      return {
        verificationGas,
        targetMempool: "alt-mempool",
        admitted: false,
        reason: `Unstaked entity capped at 100,000 gas. Current verification requires ${verificationGas.toLocaleString()} gas. Requires 0.012 ETH deposit in NaiveStakingRegistry.`,
      };
    }

    return {
      verificationGas,
      targetMempool: "alt-mempool",
      admitted: true,
      reason: `Admitted into ERC-8421 alternative mempool (${verificationGas.toLocaleString()} <= 2,000,000 gas) with active collateral.`,
    };
  }
}
