import {
  createPublicClient,
  createWalletClient,
  ExpirationTime,
  defineSchema,
  addr,
  dec,
  str,
} from "@arkiv-network/sdk";
import { eq } from "@arkiv-network/sdk/query";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http, custom, type Address, type Hex } from "viem";

export const ARKIV_CHAIN_ID = 7794095;
export const ARKIV_CHAIN_ID_HEX = "0x76edaf";
export const ARKIV_RPC_URL = "https://rpc.rabdi.db-chain.testnet.arkiv.network";
export const ARKIV_EXPLORER_URL = "https://rabdi.explorer.arkiv.network";
export const ARKIV_FAUCET_URL = "https://hub.arkiv.network/faucet";

/**
 * Arkiv DB-Chain Schema for Post-Quantum Ephemeral Leaf Reservations.
 *
 * Each entity tracks an active or pending One-Time Signature (OTS) leaf channel.
 * Entities are given an automatic 10-minute native TTL (ExpirationTime.fromMinutes(10)).
 * If an alternative mempool transaction drops without being mined, Arkiv's native
 * expiring-entity engine automatically prunes the record, safely releasing the leaf.
 */
export const LeafReservation = defineSchema("qframe.leaf-journal", {
  wallet: addr().indexed(),
  leafIndex: dec().indexed(),
  nonceKey: str().indexed(),
  action: str().indexed(), // "RESERVE" | "BURN" | "COMMIT"
  status: str(), // "PENDING_MEMPOOL" | "MINED" | "SUPERSEDED"
});

export interface ArkivJournalRecord {
  key: string;
  wallet: string;
  leafIndex: number;
  nonceKey: string;
  action: string;
  status: string;
  expiresAtBlock?: string;
}

export interface ArkivConfig {
  rpcUrl?: string;
  accessKey?: string;
  defaultTtlMinutes?: number;
}

/**
 * Creates a public read client connected to Arkiv Rabdi Testnet (Gasless queries).
 */
export function getArkivPublicClient(accessKey: string = "") {
  return createPublicClient({
    chain: rabdi({ accessKey }),
    transport: http(ARKIV_RPC_URL),
  });
}

/**
 * Queries active leaf reservation entities on Arkiv DB-chain for a specific wallet address.
 */
export async function fetchArkivReservations(
  walletAddress: Address,
  accessKey: string = ""
): Promise<ArkivJournalRecord[]> {
  try {
    const client = getArkivPublicClient(accessKey);
    const result = await client
      .select()
      .from(LeafReservation)
      .where(eq("wallet", addr(walletAddress)))
      .limit(50)
      .fetch();

    return result.entities.map((ent: any) => ({
      key: ent.$key ?? "unknown-key",
      wallet: ent.wallet?.value ?? walletAddress,
      leafIndex: Number(ent.leafIndex?.value ?? 0),
      nonceKey: ent.nonceKey?.value ?? "",
      action: ent.action?.value ?? "RESERVE",
      status: ent.status?.value ?? "PENDING_MEMPOOL",
      expiresAtBlock: ent.$expiresAt ? String(ent.$expiresAt) : undefined,
    }));
  } catch (error) {
    console.warn("[Arkiv] Query failed or empty:", error);
    return [];
  }
}

/**
 * Publishes an ephemeral post-quantum leaf reservation to Arkiv DB-Chain with native TTL.
 */
export async function publishArkivReservation(
  userAddress: Address,
  leafIndex: number,
  nonceKey: Hex,
  action: "RESERVE" | "BURN" | "COMMIT" = "RESERVE",
  options?: {
    ttlMinutes?: number;
    accessKey?: string;
    ethereumProvider?: any;
    account?: any;
  }
): Promise<{ entityKey: string; txHash: string }> {
  const ttl = options?.ttlMinutes ?? 10;
  const expiration = ExpirationTime.fromMinutes(ttl);

  if (options?.ethereumProvider) {
    const walletClient = createWalletClient({
      chain: rabdi({ accessKey: options.accessKey ?? "" }),
      transport: custom(options.ethereumProvider),
      account: userAddress,
    });

    const res: any = await walletClient.createEntity(
      LeafReservation,
      {
        wallet: addr(userAddress),
        leafIndex: dec(String(leafIndex)),
        nonceKey: String(nonceKey),
        action,
        status: "PENDING_MEMPOOL",
      },
      { expiration },
      {
        gas: 1000000n,
        gasPrice: 1000000000n,
      }
    );

    return {
      entityKey: res?.entityKey ?? `arkiv_${userAddress.slice(0, 6)}_${leafIndex}_${Date.now()}`,
      txHash: typeof res === "string" ? res : res?.txHash ?? "0x",
    };
  }

  throw new Error("No ethereumProvider or account provided for Arkiv entity creation");
}
