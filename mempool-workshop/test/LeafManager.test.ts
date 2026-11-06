import { describe, expect, it } from "vitest";
import { LeafManager, NONCE_MANAGER_ADDRESS, DEFAULT_DOMAIN_NAMESPACE } from "../src/sdk/LeafManager.js";
import { keyedNonceSlot } from "../src/lib/frameTx/predeploys.js";
import type { Address } from "viem";

describe("LeafManager SDK", () => {
  const dummyWallet: Address = "0xe5c5A34833db3A90E30adCD98f2955E36496483B";
  const dummyRpc = "https://rpc1.hegota.ethrex.xyz";

  it("should initialize with default NONCE_MANAGER predeploy address and domain namespace", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });
    expect(manager.nonceManagerAddress).toBe(NONCE_MANAGER_ADDRESS);
    expect(manager.domainNamespace).toBe(DEFAULT_DOMAIN_NAMESPACE);
  });

  it("should namespace leaf indices into 256-bit collision-free nonce keys", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const key0 = manager.deriveNonceKey(0n);
    const key1 = manager.deriveNonceKey(1n);

    expect(key0).not.toBe(0n);
    expect(key0).not.toBe(key1);
    expect(typeof key0).toBe("bigint");
  });

  it("should compute exact EIP-8250 storage slots matching the protocol reference", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const nonceKey = manager.deriveNonceKey(7n);
    const slot = manager.getStorageSlot(nonceKey);
    const expectedSlot = keyedNonceSlot(dummyWallet, nonceKey);

    expect(slot).toBe(expectedSlot);
  });

  it("should mark allocated leaves as RESERVED in the write-ahead journal", async () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const leaf0 = await manager.allocateLeaf();
    expect(leaf0).toBe(0n);

    const journal = manager.exportJournal();
    expect(journal.length).toBe(1);
    expect(journal[0].leafIndex).toBe("0");
    expect(journal[0].state).toBe("RESERVED");

    // Next allocate must not return 0n
    const leaf1 = await manager.allocateLeaf();
    expect(leaf1).toBe(1n);
  });

  it("should safely burn old leaf and allocate fresh channel on bumpFee()", async () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    const initialLeaf = await manager.allocateLeaf();
    expect(initialLeaf).toBe(0n);

    // Fee bump replacement
    const { newLeafIndex, burnedOldLeafIndex } = await manager.bumpFee(initialLeaf, "Gas spike bump");
    expect(burnedOldLeafIndex).toBe(0n);
    expect(newLeafIndex).toBe(1n);

    const statusOld = await manager.getLeafStatus(0n);
    expect(statusOld.localState).toBe("BURNED");
    expect(statusOld.isAvailable).toBe(false);
  });

  it("should apply safetyGap during wallet recovery to protect unmined signatures", async () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
    });

    // Clean recovery on new device with safety gap = 16
    const recovery = await manager.recoverWallet(16, 16);
    expect(recovery.resumeIndex).toBe(16n);

    const nextLeaf = await manager.allocateLeaf();
    expect(nextLeaf).toBe(16n);
  });

  it("should support configurable canonical and alt-mempool limits", () => {
    const manager = new LeafManager({
      rpcUrl: dummyRpc,
      walletAddress: dummyWallet,
      canonicalCap: 100_000,
      altMempoolCap: 1_000_000, // configured to sidecar 1M
    });

    const decision1 = manager.routeMempool(66_847, false);
    expect(decision1.targetMempool).toBe("canonical");
    expect(decision1.admitted).toBe(true);

    const decision2 = manager.routeMempool(259_247, false);
    expect(decision2.targetMempool).toBe("alt-mempool");
    expect(decision2.admitted).toBe(false);

    const decision3 = manager.routeMempool(259_247, true);
    expect(decision3.targetMempool).toBe("alt-mempool");
    expect(decision3.admitted).toBe(true);

    const decision4 = manager.routeMempool(1_500_000, true);
    expect(decision4.targetMempool).toBe("alt-mempool");
    expect(decision4.admitted).toBe(false); // exceeds 1M configured ceiling
  });
});
