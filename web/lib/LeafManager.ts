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
 * Client SDK for Post-Quantum Smart Accounts using EIP-8250 Keyed Nonces and ERC-8421 Alt-Mempools.
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

  public getStorageSlot(leafIndex: bigint): Hex {
    return keccak256(
      concat([
        pad(this.walletAddress, { size: 32 }),
        numberToHex(leafIndex, { size: 32 }),
      ])
    );
  }

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

  public async scanLeaves(startIndex: bigint, count: number): Promise<LeafStatus[]> {
    const promises: Promise<LeafStatus>[] = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.getLeafStatus(startIndex + BigInt(i)));
    }
    return Promise.all(promises);
  }

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
