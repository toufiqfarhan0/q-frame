import {
  LeafManager,
  NONCE_MANAGER_ADDRESS,
  ARKIV_CHAIN_ID,
  ARKIV_RPC_URL,
  fetchArkivReservations,
  type LeafStatus,
  type MempoolRouteDecision,
} from "q-frame-sdk";

export async function runSdkVerification() {
  console.log("================================================================");
  console.log("   TEST-CONSUMER-APP: VERIFYING q-frame-sdk FROM NPM ARTIFACT   ");
  console.log("================================================================\n");

  const results: Record<string, boolean> = {};

  // Check 1: Constants
  console.log("[1/8] Verifying Constants & Package Exports...");
  if (NONCE_MANAGER_ADDRESS === "0x0000000000000000000000000000000000008250" && ARKIV_CHAIN_ID === 7794095) {
    console.log(`   ✓ NONCE_MANAGER_ADDRESS: ${NONCE_MANAGER_ADDRESS}`);
    console.log(`   ✓ ARKIV_CHAIN_ID: ${ARKIV_CHAIN_ID}`);
    console.log(`   ✓ ARKIV_RPC_URL: ${ARKIV_RPC_URL}`);
    results.constants = true;
  } else {
    results.constants = false;
  }

  // Check 2: Instantiate LeafManager
  console.log("\n[2/8] Instantiating LeafManager with Hegotá & Arkiv Config...");
  const manager = new LeafManager({
    rpcUrl: "https://rpc1.hegota.ethrex.xyz",
    walletAddress: "0xe5c5A34833db3A90E30adCD98f2955E36496483B",
    canonicalCap: 100_000,
    altMempoolCap: 2_000_000,
    arkivConfig: {
      defaultTtlMinutes: 10,
    },
  });
  console.log("   ✓ LeafManager instance created successfully");
  results.instantiation = true;

  // Check 3: EIP-8250 Keyed Nonce Derivation & Storage Slot
  console.log("\n[3/8] Testing EIP-8250 Key Derivation & Storage Slot calculation...");
  const key0 = manager.deriveNonceKey(0n);
  const key1 = manager.deriveNonceKey(1n);
  const slot0 = manager.getStorageSlot(key0);
  console.log(`   ✓ Derived Key #0: 0x${key0.toString(16).slice(0, 16)}...`);
  console.log(`   ✓ Derived Key #1: 0x${key1.toString(16).slice(0, 16)}...`);
  console.log(`   ✓ Storage Slot: ${slot0}`);
  results.keyDerivation = slot0.startsWith("0x") && slot0.length === 66;

  // Check 4: Hegotá Devnet Live On-Chain Sequence Read
  console.log("\n[4/8] Querying Live On-Chain Sequence from Hegotá Devnet (0x...8250)...");
  try {
    const seq = await manager.getOnChainSequence(key0);
    console.log(`   ✓ On-Chain Sequence read directly from devnet: ${seq.toString()}`);
    results.onChainRead = true;
  } catch (e: any) {
    console.error("   ✕ Failed to read on-chain sequence:", e.message);
    results.onChainRead = false;
  }

  // Check 5: Channel Allocation
  console.log("\n[5/8] Allocating Leaf Channels...");
  const leafA = await manager.allocateLeaf();
  const leafB = await manager.allocateLeaf();
  console.log(`   ✓ Allocated Leaf #${leafA} and #${leafB}`);
  const statusA: LeafStatus = await manager.getLeafStatus(leafA);
  console.log(`   ✓ Leaf #${leafA} Local State: ${statusA.localState} (isAvailable: ${statusA.isAvailable})`);
  results.allocation = statusA.localState === "RESERVED" && !statusA.isAvailable;

  // Check 6: Safe Fee Bump (Key Burning)
  console.log("\n[6/8] Executing Safe Fee-Bump (Key Burning)...");
  const bump = await manager.bumpFee(leafA, "Gas escalation test");
  console.log(`   ✓ Burned Leaf #${bump.burnedOldLeafIndex} (Cannot be reused!)`);
  console.log(`   ✓ Allocated Replacement Leaf #${bump.newLeafIndex}`);
  const burnedStatus: LeafStatus = await manager.getLeafStatus(leafA);
  console.log(`   ✓ Verified Burned State: ${burnedStatus.localState}`);
  results.safeBump = burnedStatus.localState === "BURNED";

  // Check 7: Mempool Routing Engine
  console.log("\n[7/8] Evaluating Mempool Verification Budget Routing...");
  const rCanonical: MempoolRouteDecision = manager.routeMempool(74_000, false);
  const rAltUnstaked: MempoolRouteDecision = manager.routeMempool(259_247, false);
  const rAltStaked: MempoolRouteDecision = manager.routeMempool(259_247, true);

  console.log(`   ✓ 74k gas (Canonical): target=${rCanonical.targetMempool}, admitted=${rCanonical.admitted}`);
  console.log(`   ✓ 259k gas (Unstaked): target=${rAltUnstaked.targetMempool}, admitted=${rAltUnstaked.admitted}`);
  console.log(`   ✓ 259k gas (Staked):   target=${rAltStaked.targetMempool}, admitted=${rAltStaked.admitted}`);
  results.routing = rCanonical.admitted && !rAltUnstaked.admitted && rAltStaked.admitted;

  // Check 8: Live Arkiv DB-Chain Synchronization
  console.log("\n[8/8] Testing Live Arkiv DB-Chain Sync (Rabdi Testnet Chain 7794095)...");
  try {
    const syncCount = await manager.syncWithArkiv();
    console.log(`   ✓ manager.syncWithArkiv() connected to Rabdi testnet. Synced entities: ${syncCount}`);
    results.arkivSync = true;
  } catch (e: any) {
    console.error("   ✕ Arkiv sync failed:", e.message);
    results.arkivSync = false;
  }

  console.log("\n================================================================");
  console.log("   SUMMARY: ALL q-frame-sdk CONSUMER TESTS                      ");
  console.log("================================================================");
  for (const [k, v] of Object.entries(results)) {
    console.log(`   • ${k.padEnd(20)}: ${v ? "PASSED (100%)" : "FAILED"}`);
  }
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOVERALL VERDICT: ${allPassed ? "✓ ALL TESTS PASSED WITH ZERO ERRORS" : "✕ ISSUES DETECTED"}`);
  console.log("================================================================");

  return { results, allPassed };
}

if (require.main === module) {
  runSdkVerification()
    .then(({ allPassed }) => process.exit(allPassed ? 0 : 1))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

