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
import { http, custom } from "viem";

export type EvmAddress = `0x${string}`;
export type HexString = `0x${string}`;

export const ARKIV_CHAIN_ID = 7794095;
export const ARKIV_CHAIN_ID_HEX = "0x76edaf";
export const ARKIV_RPC_URL = "https://rpc.rabdi.db-chain.testnet.arkiv.network";
export const ARKIV_EXPLORER_URL = "https://rabdi.explorer.arkiv.network";
export const ARKIV_FAUCET_URL = "https://hub.arkiv.network/faucet";

/**
 * Arkiv DB-Chain Schema for Post-Quantum Ephemeral Leaf Reservations.
 *
 * Each entity tracks an active or pending One-Time Signature (OTS) leaf channel.
 * Entities are given an automatic 10-minute TTL (ExpirationTime.fromMinutes(10)).
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
  isExpired?: boolean;
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
export async function fetchArkivReservations(walletAddress: string): Promise<ArkivJournalRecord[]> {
  const records: ArkivJournalRecord[] = [];
  try {
    const client = getArkivPublicClient();
    const result = await client
      .select()
      .from(LeafReservation)
      .where(eq("wallet", addr(walletAddress as EvmAddress)))
      .limit(50)
      .fetch();

    if (result.entities && result.entities.length > 0) {
      for (const ent of result.entities) {
        records.push({
          key: ent.$key ?? "unknown-key",
          wallet: ent.wallet?.value ?? walletAddress,
          leafIndex: Number(ent.leafIndex?.value ?? 0),
          nonceKey: ent.nonceKey?.value ?? "",
          action: ent.action?.value ?? "RESERVE",
          status: ent.status?.value ?? "PENDING_MEMPOOL",
          expiresAtBlock: ent.$expiresAt ? `Block #${ent.$expiresAt}` : undefined,
        });
      }
    }
  } catch (error) {
    console.warn("[Arkiv] Direct RPC query note:", error);
  }

  // Also query local API endpoint for active synced entities
  try {
    const res = await fetch(`/api/arkiv?wallet=${walletAddress}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entities)) {
        const seen = new Set(records.map((r) => r.key));
        for (const e of data.entities) {
          if (!seen.has(e.key)) {
            records.push({
              key: e.key,
              wallet: e.wallet,
              leafIndex: e.leafIndex,
              nonceKey: e.nonceKey,
              action: e.action,
              status: e.status,
              expiresAtBlock: e.expiresAt
                ? (typeof e.expiresAt === "string" && e.expiresAt.startsWith("In")
                    ? e.expiresAt
                    : `Blk #${e.expiresAt}`)
                : "In 10m (300 blks)",
            });
            seen.add(e.key);
          }
        }
      }
    }
  } catch (apiErr) {
    // Ignore in non-browser or offline
  }

  return records;
}

/**
 * Publishes an ephemeral post-quantum leaf reservation to Arkiv DB-Chain with 10-min TTL.
 */
export async function publishArkivReservation(
  userAddress: EvmAddress,
  leafIndex: number,
  nonceKey: HexString,
  action: "RESERVE" | "BURN" | "COMMIT" = "RESERVE",
  ethereumProvider?: any
): Promise<{ entityKey: string; txHash: string }> {
  const expiration = ExpirationTime.fromMinutes(10);

  if (ethereumProvider) {
    try {
      let chainIdHex = await ethereumProvider.request({ method: "eth_chainId" });
      let currentChainId = parseInt(chainIdHex, 16);

      // Auto-prompt MetaMask to switch or add Arkiv Rabdi Testnet
      if (currentChainId !== ARKIV_CHAIN_ID) {
        await switchOrAddRabdiNetwork(ethereumProvider);
        chainIdHex = await ethereumProvider.request({ method: "eth_chainId" });
        currentChainId = parseInt(chainIdHex, 16);
      }

      if (currentChainId === ARKIV_CHAIN_ID) {
        const walletClient = createWalletClient({
          chain: rabdi({ accessKey: "" }),
          transport: custom(ethereumProvider),
          account: userAddress,
        });

        // SDK 1.0.1 on Rabdi: specify explicit gas floor of 1M + 1 gwei gasPrice
        // as per official Arkiv write-safety guidelines for browser wallets
        const res = await walletClient.createEntity(
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
            gasPrice: 1000000000n, // 1 gwei
          }
        );

        return {
          entityKey: res.entityKey,
          txHash: res.txHash,
        };
      }
    } catch (e: any) {
      console.warn("[Arkiv] Direct wallet submission not available or on wrong network, relaying via onchain API:", e);
    }
  }

  // Fallback to server route
  const response = await fetch("/api/arkiv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: userAddress,
      leafIndex,
      nonceKey,
      action,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to commit entity to Arkiv");
  }

  return response.json();
}

/**
 * Switch or add Arkiv Rabdi Testnet to the user's browser wallet (e.g. MetaMask).
 */
export async function switchOrAddRabdiNetwork(ethereum: any) {
  if (!ethereum) throw new Error("MetaMask not detected");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARKIV_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    // 4902 means the chain is not yet added
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ARKIV_CHAIN_ID_HEX,
            chainName: "Arkiv Rabdi Testnet",
            nativeCurrency: {
              name: "Golem",
              symbol: "tGLM",
              decimals: 18,
            },
            rpcUrls: [ARKIV_RPC_URL],
            blockExplorerUrls: [ARKIV_EXPLORER_URL],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
