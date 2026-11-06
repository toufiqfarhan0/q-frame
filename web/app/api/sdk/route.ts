import { NextResponse } from "next/server";
import { LeafManager, type Address } from "@/lib/LeafManager";

const RPC_URL = "https://rpc1.hegota.ethrex.xyz";
const DEFAULT_WALLET: Address = "0xe5c5A34833db3A90E30adCD98f2955E36496483B";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      walletAddress = DEFAULT_WALLET,
      count = 1,
      leafIndex = 0,
      reason = "Fee bump replacement",
      scanWindow = 64,
      safetyGap = 16,
      verificationGas = 259247,
      isStaked = true,
      initialJournal = [],
    } = body;

    const manager = new LeafManager({
      rpcUrl: RPC_URL,
      walletAddress: walletAddress as Address,
      canonicalCap: 100_000,
      altMempoolCap: 2_000_000,
      initialJournal,
    });

    if (action === "scan") {
      const startIndex = BigInt(body.startIndex ?? 0);
      const scanCount = Number(body.count ?? 12);
      const statuses = await manager.scanLeaves(startIndex, scanCount);
      const serialized = statuses.map((s) => ({
        leafIndex: s.leafIndex.toString(),
        nonceKey: "0x" + s.nonceKey.toString(16),
        storageSlot: s.storageSlot,
        onChainSequence: s.onChainSequence.toString(),
        localState: s.localState,
        isAvailable: s.isAvailable,
      }));
      return NextResponse.json({ ok: true, action: "scan", statuses: serialized });
    }

    if (action === "allocate") {
      const leaves = await manager.allocateParallelLeaves(Number(count));
      return NextResponse.json({
        ok: true,
        action: "allocate",
        allocatedLeaves: leaves.map((l) => l.toString()),
        journal: manager.exportJournal(),
      });
    }

    if (action === "bump") {
      const bump = await manager.bumpFee(BigInt(leafIndex), reason);
      return NextResponse.json({
        ok: true,
        action: "bump",
        burnedOldLeafIndex: bump.burnedOldLeafIndex.toString(),
        newLeafIndex: bump.newLeafIndex.toString(),
        journal: manager.exportJournal(),
      });
    }

    if (action === "recover") {
      const recovery = await manager.recoverWallet(Number(scanWindow), Number(safetyGap));
      return NextResponse.json({
        ok: true,
        action: "recover",
        highestMinedLeaf: recovery.highestMinedLeaf?.toString() ?? null,
        resumeIndex: recovery.resumeIndex.toString(),
      });
    }

    if (action === "route") {
      const decision = manager.routeMempool(Number(verificationGas), Boolean(isStaked));
      return NextResponse.json({ ok: true, action: "route", decision });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
