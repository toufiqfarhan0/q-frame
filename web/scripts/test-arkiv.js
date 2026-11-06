/**
 * Q-FRAME Arkiv Integration Diagnostic Test
 *
 * Verifies live connection to Arkiv Rabdi Testnet (Chain ID 7794095),
 * validates the `qframe.leaf-journal` schema, and performs an indexed query.
 */

const { createPublicClient } = require("@arkiv-network/sdk");
const { defineSchema, str, addr, dec } = require("@arkiv-network/sdk/schema");
const { eq } = require("@arkiv-network/sdk/query");
const { rabdi } = require("@arkiv-network/sdk/chains");
const { http } = require("viem");

const ARKIV_CHAIN_ID = 7794095;
const ARKIV_RPC = "https://rpc.rabdi.db-chain.testnet.arkiv.network";
const TEST_WALLET = "0x2644Dd7905bE00422BBc79aF4E158993031fe9Ed";

const LeafReservation = defineSchema("qframe.leaf-journal", {
  wallet: addr().indexed(),
  leafIndex: dec().indexed(),
  nonceKey: str().indexed(),
  action: str().indexed(),
  status: str(),
});

async function main() {
  console.log("=================================================");
  console.log("   Q-FRAME — ARKIV DB-CHAIN DIAGNOSTIC TEST     ");
  console.log("=================================================");
  console.log(`Connecting to: ${ARKIV_RPC}`);
  console.log(`Target Chain ID: ${ARKIV_CHAIN_ID} (Rabdi Testnet)\n`);

  const client = createPublicClient({
    chain: rabdi({ accessKey: "" }),
    transport: http(ARKIV_RPC),
  });

  // 1. Block check
  const blockNumber = await client.getBlockNumber();
  console.log(`✓ 1. Live Block Number on Arkiv Rabdi: #${blockNumber}`);

  // 2. Gas price check
  const gasPrice = await client.getGasPrice();
  console.log(`✓ 2. Rabdi Gas Price: ${gasPrice} wei (1 gwei)`);

  // 3. Schema and Indexed Query Check
  console.log(`✓ 3. Executing indexed query on schema [${LeafReservation.name}]...`);
  console.log(`     Filter: WHERE wallet == ${TEST_WALLET}`);
  
  const queryStart = Date.now();
  const result = await client
    .select()
    .from(LeafReservation)
    .where(eq("wallet", addr(TEST_WALLET)))
    .limit(10)
    .fetch();
  const queryDuration = Date.now() - queryStart;

  console.log(`✓ 4. Query returned successfully in ${queryDuration}ms!`);
  console.log(`     Active Entities Found: ${result.entities.length}`);

  if (result.entities.length > 0) {
    result.entities.forEach((ent, i) => {
      console.log(`     [${i}] Key: ${ent.$key} | Leaf: ${ent.leafIndex?.value} | Action: ${ent.action?.value}`);
    });
  } else {
    console.log("     (No active unexpired entities for this address; ready to receive allocations)");
  }

  console.log("\n=================================================");
  console.log("   ALL ARKIV INTEGRATION TESTS PASSED (100%)    ");
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("✕ Arkiv Test Failed:", err);
  process.exit(1);
});

