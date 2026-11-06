import { describe, expect, it } from "vitest";
import { LeafManager, NONCE_MANAGER_ADDRESS } from "../src/sdk/LeafManager.js";
import { keyedNonceSlot, NONCE_MANAGER } from "../src/lib/frameTx/predeploys.js";
import type { Address } from "viem";

describe("LeafManager SDK", () => {
  const dummyWallet: Address = "0xe5c5A34833db3A90E30adCD98f2955E36496483B";
  const dummyRpc = "https://rpc1.hegota.ethrex.xyz";

  it("should initialize with default NONCE_MANAGER predeploy address", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });
    expect(manager.nonceManagerAddress).toBe(NONCE_MANAGER_ADDRESS);
    expect(manager.nonceManagerAddress.toLowerCase()).toBe(NONCE_MANAGER.toLowerCase());
  });

  it("should compute exact EIP-8250 storage slots matching protocol reference", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const slot0 = manager.getStorageSlot(0n);
    const expectedSlot0 = keyedNonceSlot(dummyWallet, 0n);
    expect(slot0).toBe(expectedSlot0);

    const slot7 = manager.getStorageSlot(7n);
    const expectedSlot7 = keyedNonceSlot(dummyWallet, 7n);
    expect(slot7).toBe(expectedSlot7);
  });

  it("should route transactions <= 100k gas to canonical mempool", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const route = manager.routeMempool(66_847, false);
    expect(route.targetMempool).toBe("canonical");
    expect(route.admitted).toBe(true);
    expect(route.reason).toContain("Within canonical mempool limit");
  });

  it("should reject transactions > 100k in alt-mempool if entity is unstaked", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const route = manager.routeMempool(259_247, false);
    expect(route.targetMempool).toBe("alt-mempool");
    expect(route.admitted).toBe(false);
    expect(route.reason).toContain("Unstaked entity capped at 100,000 gas");
  });

  it("should admit transactions between 100k and 2M gas in alt-mempool if entity is staked", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const route = manager.routeMempool(259_247, true);
    expect(route.targetMempool).toBe("alt-mempool");
    expect(route.admitted).toBe(true);
    expect(route.reason).toContain("Admitted into ERC-8421 alternative mempool");
  });

  it("should reject transactions exceeding the 2M gas ceiling even if staked", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const route = manager.routeMempool(2_100_000, true);
    expect(route.targetMempool).toBe("alt-mempool");
    expect(route.admitted).toBe(false);
    expect(route.reason).toContain("Exceeds alternative mempool ceiling");
  });
});
