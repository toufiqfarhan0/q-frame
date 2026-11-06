import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, encodeFunctionData, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = "0x56a427d9de2d9f12a6f36361c35760a71c7b95495054e268e410e4d719708272";
const RPC_URL = "https://rpc1.hegota.ethrex.xyz";
const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";
const PQ_ACCOUNT = "0xe5c5A34833db3A90E30adCD98f2955E36496483B";
const DEMO_RECIPIENT = "0x8943545177806ED17B9F23F0a21ee5948eCaa776";

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({ account, transport: http(RPC_URL) });
const publicClient = createPublicClient({ transport: http(RPC_URL) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, chains = 15, iterations = 20, isStaked = false } = body;
    const calculatedGas = Math.round(37247 + chains * iterations * 740);

    // ACTION 1: Stake 0.012 ETH on-chain via NaiveStakingRegistry.addStake(86400)
    if (action === "stake") {
      const stakeAbi = parseAbi(["function addStake(uint32 unstakeDelaySec) external payable"]);
      const stakeCalldata = encodeFunctionData({
        abi: stakeAbi,
        functionName: "addStake",
        args: [86400],
      });
      const hash = await walletClient.sendTransaction({
        to: STAKING_REGISTRY as `0x${string}`,
        value: parseEther("0.012"),
        data: stakeCalldata,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return NextResponse.json({
        ok: true,
        action: "stake",
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status,
        timestamp: new Date().toISOString(),
      });
    }

    // ACTION 2: Test Canonical Mempool Admission (100k cap)
    if (action === "test_canonical") {
      if (calculatedGas > 100000) {
        return NextResponse.json({
          ok: false,
          rejected: true,
          action: "test_canonical",
          calculatedGas,
          cap: 100000,
          reason: `CANONICAL_REJECTED: Verification budget (${calculatedGas.toLocaleString()} gas) exceeds the canonical P2P mempool ceiling of 100,000 gas.`,
        });
      }
      return NextResponse.json({
        ok: true,
        admitted: true,
        action: "test_canonical",
        calculatedGas,
        cap: 100000,
        reason: `CANONICAL_ADMITTED: Verification budget (${calculatedGas.toLocaleString()} gas) fits within the 100,000 gas ceiling.`,
      });
    }

    // ACTION 3: Transact on Alt-Mempool (1M cap)
    if (action === "transact_pq") {
      if (!isStaked) {
        return NextResponse.json({
          ok: false,
          rejected: true,
          action: "transact_pq",
          calculatedGas,
          isStaked: false,
          reason: `ALT_MEMPOOL_UNSTAKED_REJECTED: Senders without active collateral in NaiveStakingRegistry are restricted to 100,000 gas. Current verification requires ${calculatedGas.toLocaleString()} gas. Deposit 0.012 ETH stake to unlock the 1,000,000 gas allowance.`,
        });
      }

      if (calculatedGas > 1000000) {
        return NextResponse.json({
          ok: false,
          rejected: true,
          action: "transact_pq",
          calculatedGas,
          isStaked: true,
          reason: `EXCEEDS_MAX_BUDGET: Verification requires ${calculatedGas.toLocaleString()} gas, which exceeds the absolute 1,000,000 gas per-entity cap.`,
        });
      }

      // Execute on-chain transaction on PQBenchmarkAccount
      const abi = parseAbi([
        "function execute(address target, uint256 value, bytes calldata data) external returns (bytes memory)"
      ]);
      const calldata = encodeFunctionData({
        abi,
        functionName: "execute",
        args: [DEMO_RECIPIENT as `0x${string}`, 0n, "0x"],
      });

      const hash = await walletClient.sendTransaction({
        to: PQ_ACCOUNT as `0x${string}`,
        data: calldata,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return NextResponse.json({
        ok: true,
        admitted: true,
        action: "transact_pq",
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed),
        calculatedGas,
        status: receipt.status,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Transact API error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Execution error" }, { status: 500 });
  }
}

