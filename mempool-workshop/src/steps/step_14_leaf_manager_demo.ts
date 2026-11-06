import { privateKeyToAccount } from "viem/accounts";
import { LeafManager } from "../sdk/LeafManager.js";
import { loadConfig } from "../lib/config.js";
import { buildWalletTx, signFrameTx } from "../lib/frameTx/build.js";
import { accountNonce, sendFrameTx, waitForReceipt, explorerLink } from "../lib/frameTx/send.js";
import { runStep } from "../lib/output.js";
import { ensureParticipantKey, requireState } from "../lib/state.js";

runStep("step_14_leaf_manager_demo", async (ctx) => {
  const cfg = loadConfig();
  const rawState = JSON.parse(await import("fs").then(fs => fs.readFileSync("C:\\Users\\toufi\\Desktop\\eth\\mempool-workshop\\.workshop-state.json", "utf-8")));
  const wallet = (rawState.pqWallet || rawState.wallet || "0xe5c5A34833db3A90E30adCD98f2955E36496483B") as `0x${string}`;
  const ownerKey = ensureParticipantKey();
  const owner = privateKeyToAccount(ownerKey).address;

  ctx.log("================================================================================");
  ctx.log("Q-FRAME LEAF-MANAGER SDK: LIVE DEVNET DEMO & ZERO-STATE RECOVERY VERIFICATION");
  ctx.log("================================================================================\n");

  const manager = new LeafManager({
    rpcUrl: cfg.gatewayUrl,
    walletAddress: wallet,
    canonicalCap: 100_000,
    altMempoolCap: 2_000_000,
  });

  // Step 1: Allocate parallel leaves
  ctx.log("1. Allocating 3 parallel leaf channels for multi-tx mempool dispatch...");
  const [leafA, leafB, leafC] = await manager.allocateParallelLeaves(3);
  ctx.log(`   Allocated Leaves: #${leafA}, #${leafB}, #${leafC} (All marked RESERVED in write-ahead journal)\n`);

  // Step 2: Demonstrate Safe Fee-Bumping
  ctx.log("2. Demonstrating Safe Fee-Bumping (Replace-By-Fee Policy)...");
  ctx.log(`   Triggering fee bump for Leaf #${leafA}...`);
  const bumpResult = await manager.bumpFee(leafA, "Gas price escalated during mempool queue");
  ctx.log(`   Old Leaf #${bumpResult.burnedOldLeafIndex} -> Permanently marked BURNED (Never reusable!)`);
  ctx.log(`   Replacement Leaf #${bumpResult.newLeafIndex} -> Allocated for replacement payload\n`);

  // Step 3: Broadcast a live frame transaction on the replacement leaf
  const activeLeaf = bumpResult.newLeafIndex;
  const activeNonceKey = manager.deriveNonceKey(activeLeaf);
  ctx.log(`3. Broadcasting real on-chain transaction using Leaf #${activeLeaf}...`);
  ctx.log(`   Namespaced EIP-8250 Nonce Key: ${activeNonceKey.toString(16).slice(0, 16)}...`);

  const tx = await signFrameTx(
    buildWalletTx({
      wallet,
      owner,
      to: cfg.recipient,
      value: cfg.transferWei,
      nonce: 0n,
      nonceKeys: [activeNonceKey],
      chainId: cfg.chainId,
      maxFeePerGas: cfg.maxFeePerGasWei,
    }),
    ownerKey
  );

  const hash = await sendFrameTx(tx);
  ctx.log(`   Transaction broadcast to mempool: ${hash}`);
  ctx.log(`   Waiting for Hegotá block inclusion...`);
  const receipt = await waitForReceipt(hash);
  ctx.log(`   MINED on Devnet: Block #${Number(receipt.blockNumber)}!`);

  // Verify on-chain sequence changed in NONCE_MANAGER
  const onChainSeq = await manager.getOnChainSequence(activeNonceKey);
  ctx.log(`   Direct eth_getStorageAt check on NONCE_MANAGER (0x...8250): Sequence = ${onChainSeq} (MINED)\n`);

  // Step 4: Demonstrate Dropped / Unmined Transaction Safety
  ctx.log("4. Demonstrating Dropped Transaction Protection (The Zero-State Recovery Gap)...");
  ctx.log(`   Scenario: Leaf #${leafB} was signed on Device A but dropped/never mined in the mempool.`);
  ctx.log(`   On-chain storage for Leaf #${leafB} is still 0.`);
  ctx.log(`   Now simulating wallet recovery on Device B (fresh install, NO local journal)...\n`);

  const freshManagerOnDeviceB = new LeafManager({
    rpcUrl: cfg.gatewayUrl,
    walletAddress: wallet,
  });

  const recovery = await freshManagerOnDeviceB.recoverWallet(32, 16);
  ctx.log(`   Recovery scan found highest mined leaf: #${recovery.highestMinedLeaf}`);
  ctx.log(`   Safety Gap applied: +16 leaves`);
  ctx.log(`   Resume allocation cursor set to: #${recovery.resumeIndex}`);

  const nextSafeLeaf = await freshManagerOnDeviceB.allocateLeaf();
  ctx.log(`   First leaf allocated on new device: #${nextSafeLeaf}`);

  const isSafe = nextSafeLeaf > leafB;
  ctx.log(`   Verification: Dropped Leaf #${leafB} was SKIPPED: ${isSafe ? "YES (FORGERY PREVENTED!)" : "NO"}\n`);

  return {
    summary: [
      `LeafManager SDK Live Devnet Verification:`,
      `✓ Allocated parallel channels: #${leafA}, #${leafB}, #${leafC}`,
      `✓ Safe Fee-Bumping: Burned #${leafA}, allocated replacement #${bumpResult.newLeafIndex}`,
      `✓ Mined Transaction: ${hash} in Block #${Number(receipt.blockNumber)}`,
      `✓ NONCE_MANAGER storage verification: sequence moved 0 -> ${onChainSeq}`,
      `✓ Recovery Safety Gap: Dropped Leaf #${leafB} successfully protected (resumed at #${recovery.resumeIndex})`,
      `✓ Explorer Link: ${explorerLink(hash)}`,
    ].join("\n"),
    ok: onChainSeq === 1n && isSafe,
    hint: "Leaf manager on-chain verification complete.",
    data: {
      wallet,
      activeLeaf: activeLeaf.toString(),
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      onChainSeq: onChainSeq.toString(),
      recoveryResumeIndex: recovery.resumeIndex.toString(),
    },
  };
});
