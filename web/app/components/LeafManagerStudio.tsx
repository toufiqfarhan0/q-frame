"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Layers,
  ArrowRight,
  Flame,
  RotateCcw,
  RefreshCw,
  Terminal,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Info,
  Key,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { LeafManager, LeafStatus, JournalEntry, MempoolRouteDecision, Address } from "@/lib/LeafManager";
import {
  fetchArkivReservations,
  publishArkivReservation,
  switchOrAddRabdiNetwork,
  ARKIV_CHAIN_ID,
  ARKIV_FAUCET_URL,
  ARKIV_EXPLORER_URL,
  type ArkivJournalRecord,
} from "@/lib/arkivClient";

const RPC_URL = "https://rpc1.hegota.ethrex.xyz";
const NONCE_MANAGER = "0x0000000000000000000000000000000000008250";
const DEFAULT_ACCOUNT: Address = "0xe5c5A34833db3A90E30adCD98f2955E36496483B";

interface LeafManagerStudioProps {
  userWallet?: string | null;
}

export default function LeafManagerStudio({ userWallet }: LeafManagerStudioProps) {
  const activeWallet = (userWallet && userWallet.startsWith("0x") ? userWallet : DEFAULT_ACCOUNT) as Address;

  // SDK Instance
  const manager = useMemo(() => {
    return new LeafManager({
      rpcUrl: RPC_URL,
      walletAddress: activeWallet,
      canonicalCap: 100_000,
      altMempoolCap: 2_000_000,
    });
  }, [activeWallet]);

  const initialLeaves = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const idx = BigInt(i);
      const nonceKey = manager.deriveNonceKey(idx);
      return {
        leafIndex: idx,
        nonceKey,
        storageSlot: manager.getStorageSlot(nonceKey),
        onChainSequence: 0n,
        localState: "UNUSED" as const,
        isAvailable: true,
      };
    });
  }, [manager]);

  // UI States
  const [leaves, setLeaves] = useState<LeafStatus[]>(initialLeaves);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"channels" | "bump" | "recovery" | "router" | "arkiv">("channels");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Workflow: Allocation
  const [allocateCount, setAllocateCount] = useState<number>(3);
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // Workflow: Fee Bump
  const [selectedLeafToBump, setSelectedLeafToBump] = useState<number>(0);
  const [bumpReason, setBumpReason] = useState<string>("Mempool gas price escalation (+25% fee)");
  const [isBumping, setIsBumping] = useState<boolean>(false);

  // Workflow: Recovery
  const [safetyGap, setSafetyGap] = useState<number>(16);
  const [scanWindow, setScanWindow] = useState<number>(32);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveryResult, setRecoveryResult] = useState<{ highestMined: string | null; resumeIndex: string } | null>(null);

  // Workflow: Mempool Router
  const [routerGas, setRouterGas] = useState<number>(259247);
  const [routerIsStaked, setRouterIsStaked] = useState<boolean>(true);
  const [routeDecision, setRouteDecision] = useState<MempoolRouteDecision | null>(null);

  // Workflow: Arkiv DB-Chain Integration
  const [arkivEntities, setArkivEntities] = useState<ArkivJournalRecord[]>([]);
  const [isArkivLoading, setIsArkivLoading] = useState<boolean>(false);
  const [isArkivPublishing, setIsArkivPublishing] = useState<boolean>(false);
  const [selectedLeafForArkiv, setSelectedLeafForArkiv] = useState<number>(0);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  // Sync leaves status from Devnet and SDK
  const refreshLeaves = useCallback(async () => {
    setIsScanning(true);
    try {
      const scanCount = Math.max(12, Number(manager.getCursor()) + 3);
      addLog(`Syncing leaves 0..${scanCount - 1} against NONCE_MANAGER (${NONCE_MANAGER.slice(0, 10)}...) on Hegotá`);
      const scanned = await manager.scanLeaves(0n, scanCount);
      setLeaves(scanned);
      setJournal(manager.exportJournal());
      addLog(`✓ Synchronized ${scanned.length} leaf channels. Mined on-chain: ${scanned.filter((s) => s.localState === "MINED").length}`);
    } catch (err: any) {
      addLog(`✕ Error syncing from devnet: ${err?.message || String(err)}`);
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  }, [manager, addLog]);

  useEffect(() => {
    refreshLeaves();
  }, [refreshLeaves]);

  // Update Route Decision whenever gas or stake state changes
  useEffect(() => {
    const decision = manager.routeMempool(routerGas, routerIsStaked);
    setRouteDecision(decision);
  }, [manager, routerGas, routerIsStaked]);

  // Handle Allocate
  const handleAllocate = async () => {
    setIsAllocating(true);
    try {
      addLog(`Allocating ${allocateCount} parallel leaf channel(s) via SDK allocateParallelLeaves()...`);
      const allocated = await manager.allocateParallelLeaves(allocateCount);
      addLog(`✓ Write-ahead journal updated! Allocated leaves: [${allocated.map((l) => `#${l}`).join(", ")}] marked RESERVED.`);
      await refreshLeaves();
    } catch (err: any) {
      addLog(`✕ Allocation failed: ${err.message}`);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleBroadcastLiveWalletTx = async (leafIndexToUse: number) => {
    setIsBroadcasting(true);
    try {
      const w = window as any;
      const eth = w.ethereum;
      if (!eth || !userWallet) {
        addLog("✕ Please connect your browser wallet (MetaMask / Rabby) first to broadcast from your account!");
        return;
      }

      addLog(`Preparing on-chain transaction for Leaf #${leafIndexToUse}...`);
      addLog(`Prompting wallet ${userWallet.slice(0, 6)}...${userWallet.slice(-4)} for authorization...`);

      const executeCalldata = "0xb61d27f60000000000000000000000008943545177806ed17b9f23f0a21ee5948ecaa776000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000";

      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: userWallet,
            to: "0xe5c5A34833db3A90E30adCD98f2955E36496483B", // PQBenchmarkAccount
            data: executeCalldata,
          },
        ],
      });

      addLog(`✓ Transaction submitted! Hash: ${txHash.slice(0, 10)}... (Signed by ${userWallet.slice(0, 6)}...)`);
      addLog("Waiting for block inclusion on Hegotá devnet...");

      // Update state
      manager.setLeafState(BigInt(leafIndexToUse), "RESERVED", `Broadcast in tx ${txHash.slice(0, 8)}`);
      await refreshLeaves();
    } catch (err: any) {
      addLog(`✕ Broadcast cancelled or failed: ${err.message || String(err)}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handle Fee Bump
  const handleFeeBump = async () => {
    setIsBumping(true);
    try {
      addLog(`Triggering safe fee bump for Leaf #${selectedLeafToBump}...`);
      addLog(`Invariant: OTS leaf keys must NEVER sign two messages. Burning Leaf #${selectedLeafToBump}...`);
      const result = await manager.bumpFee(BigInt(selectedLeafToBump), bumpReason);
      addLog(`✓ Leaf #${result.burnedOldLeafIndex} is now permanently BURNED!`);
      addLog(`✓ Replacement Leaf #${result.newLeafIndex} allocated for re-submission with higher gas.`);
      await refreshLeaves();
    } catch (err: any) {
      addLog(`✕ Fee bump failed: ${err.message}`);
    } finally {
      setIsBumping(false);
    }
  };

  // Handle Zero-State Recovery
  const handleRecovery = async () => {
    setIsRecovering(true);
    try {
      addLog(`Simulating zero-state wallet recovery on fresh device (journal cleared)...`);
      addLog(`Scanning on-chain sequence storage in window 0..${scanWindow} on NONCE_MANAGER...`);
      const result = await manager.recoverWallet(scanWindow, safetyGap);
      setRecoveryResult({
        highestMined: result.highestMinedLeaf !== null ? result.highestMinedLeaf.toString() : null,
        resumeIndex: result.resumeIndex.toString(),
      });
      addLog(`✓ Recovery scan complete: Highest mined leaf is ${result.highestMinedLeaf !== null ? `#${result.highestMinedLeaf}` : "none"}`);
      addLog(`✓ Applied Safety Gap (+${safetyGap} leaves). Safely resuming allocation at Leaf #${result.resumeIndex}!`);
      await refreshLeaves();
    } catch (err: any) {
      addLog(`✕ Recovery failed: ${err.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // Arkiv DB-Chain Handlers
  const handleQueryArkiv = useCallback(async () => {
    setIsArkivLoading(true);
    addLog(`Querying Arkiv DB-Chain entities for ${activeWallet.slice(0, 10)}... (Rabdi Testnet Chain ID: 7794095)`);
    try {
      const records = await fetchArkivReservations(activeWallet);
      setArkivEntities(records);
      addLog(`✓ Synchronized with Arkiv DB-Chain: Found ${records.length} active time-scoped entity records`);
    } catch (err: any) {
      addLog(`✕ Arkiv query notice: ${err?.message || String(err)}`);
    } finally {
      setIsArkivLoading(false);
    }
  }, [activeWallet, addLog]);

  const handlePublishToArkiv = async () => {
    setIsArkivPublishing(true);
    const targetLeaf = leaves[selectedLeafForArkiv];
    if (!targetLeaf) {
      addLog("✕ No leaf selected to commit to Arkiv");
      setIsArkivPublishing(false);
      return;
    }

    addLog(`Publishing leaf #${targetLeaf.leafIndex} reservation to Arkiv DB-Chain with 10-minute native TTL...`);
    try {
      const ethereum = typeof window !== "undefined" ? (window as any).ethereum : undefined;
      const nonceHex = `0x${targetLeaf.nonceKey.toString(16).padStart(64, "0")}` as `0x${string}`;
      const res = await publishArkivReservation(
        activeWallet,
        Number(targetLeaf.leafIndex),
        nonceHex,
        "RESERVE",
        ethereum
      );
      addLog(`✓ Entity registered on Arkiv DB-Chain! Entity Key: ${res.entityKey} (TTL: 10m)`);
      if (res.txHash) {
        addLog(`  Rabdi Tx Hash: ${res.txHash}`);
      }
      await handleQueryArkiv();
    } catch (err: any) {
      addLog(`✕ Failed to publish to Arkiv: ${err?.message || String(err)}`);
    } finally {
      setIsArkivPublishing(false);
    }
  };

  const handleSwitchRabdi = async () => {
    try {
      const ethereum = typeof window !== "undefined" ? (window as any).ethereum : undefined;
      if (!ethereum) {
        alert("MetaMask not detected. Please install MetaMask to switch to Arkiv Rabdi Testnet.");
        return;
      }
      await switchOrAddRabdiNetwork(ethereum);
      addLog(`✓ Connected MetaMask to Arkiv Rabdi Testnet (Chain ID 7794095)`);
    } catch (err: any) {
      addLog(`✕ Error switching to Rabdi: ${err?.message || String(err)}`);
    }
  };

  // Reset Demo State
  const handleReset = async () => {
    manager.resetJournal(0n);
    setRecoveryResult(null);
    setConsoleLogs([]);
    addLog("SDK journal reset. Re-scanning devnet...");
    await refreshLeaves();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Summary counts
  const countMined = leaves.filter((l) => l.localState === "MINED").length;
  const countReserved = leaves.filter((l) => l.localState === "RESERVED").length;
  const countBurned = leaves.filter((l) => l.localState === "BURNED").length;
  const countUnused = leaves.filter((l) => l.localState === "UNUSED").length;

  return (
    <section id="sdk-demo" className="py-20 bg-white swiss-border-b">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b-2 border-[#1A1A1A]">
          <div>
            <div className="text-xs font-mono text-[#D82C2C] uppercase font-bold tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#D82C2C] inline-block animate-pulse" />
              <span>04 / INTERACTIVE SDK DEMO &amp; KEYED-NONCE STUDIO</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
              LeafManager SDK Playground
            </h2>
            <p className="text-base text-[#1A1A1A]/75 max-w-3xl mt-2 leading-relaxed">
              Test the stateful post-quantum One-Time Signature (OTS) client SDK directly against live Hegot&aacute; Devnet predeploys.
              Demonstrates write-ahead journals, safe fee-bumping, parallel EIP-8250 channel allocation, and zero-state recovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshLeaves}
              disabled={isScanning}
              className="px-4 py-2 bg-white border border-[#1A1A1A] text-xs font-mono font-bold hover:bg-[#F2F2F2] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>SYNC DEVNET</span>
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-mono font-bold hover:bg-black flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET DEMO</span>
            </button>
          </div>
        </div>

        {/* Live Context Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 py-6 font-mono text-xs border-b border-[#E2E6E6]">
          <div className="p-3 bg-[#F2F2F2] border border-[#E2E6E6]">
            <div className="text-[10px] text-[#A9B2B1] uppercase font-bold">Target Account</div>
            <div className="font-bold text-[#1A1A1A] truncate mt-1" title={activeWallet}>
              {activeWallet.slice(0, 6)}...{activeWallet.slice(-4)}
            </div>
          </div>
          <div className="p-3 bg-[#F2F2F2] border border-[#E2E6E6]">
            <div className="text-[10px] text-[#A9B2B1] uppercase font-bold">Predeploy (EIP-8250)</div>
            <div className="font-bold text-[#D82C2C] truncate mt-1" title={NONCE_MANAGER}>
              0x...8250
            </div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] text-emerald-800 uppercase font-bold">Mined On-Chain</div>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">{countMined}</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200">
            <div className="text-[10px] text-amber-800 uppercase font-bold">Reserved in Journal</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5">{countReserved}</div>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200">
            <div className="text-[10px] text-rose-800 uppercase font-bold">Burned (Safe Bump)</div>
            <div className="text-lg font-bold text-rose-700 mt-0.5">{countBurned}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-700 uppercase font-bold">Unused Channels</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{countUnused}</div>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200">
            <div className="text-[10px] text-purple-800 uppercase font-bold flex items-center justify-between">
              <span>Arkiv DB-Chain</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </div>
            <div className="text-lg font-bold text-purple-700 mt-0.5">
              {arkivEntities.length} <span className="text-[10px] font-normal text-purple-600">active</span>
            </div>
          </div>
        </div>

        {/* Studio Workspace: Tabs and Main View */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tab Selector */}
            <div className="flex border-b border-[#1A1A1A] bg-[#F2F2F2]">
              <button
                onClick={() => setActiveTab("channels")}
                className={`flex-1 py-3 px-2 text-xs font-mono font-bold text-center border-r border-[#1A1A1A] transition-colors ${
                  activeTab === "channels" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A] hover:bg-white"
                }`}
              >
                1. ALLOCATE
              </button>
              <button
                onClick={() => setActiveTab("bump")}
                className={`flex-1 py-3 px-2 text-xs font-mono font-bold text-center border-r border-[#1A1A1A] transition-colors ${
                  activeTab === "bump" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A] hover:bg-white"
                }`}
              >
                2. SAFE BUMP
              </button>
              <button
                onClick={() => setActiveTab("recovery")}
                className={`flex-1 py-3 px-2 text-xs font-mono font-bold text-center border-r border-[#1A1A1A] transition-colors ${
                  activeTab === "recovery" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A] hover:bg-white"
                }`}
              >
                3. RECOVERY
              </button>
              <button
                onClick={() => setActiveTab("router")}
                className={`flex-1 py-3 px-2 text-xs font-mono font-bold text-center border-r border-[#1A1A1A] transition-colors ${
                  activeTab === "router" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A] hover:bg-white"
                }`}
              >
                4. ROUTER
              </button>
              <button
                onClick={() => {
                  setActiveTab("arkiv");
                  handleQueryArkiv();
                }}
                className={`flex-1 py-3 px-2 text-xs font-mono font-bold text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === "arkiv" ? "bg-purple-900 text-white" : "text-purple-950 hover:bg-purple-100"
                }`}
              >
                <Database className="w-3 h-3 text-purple-400" />
                <span>5. ARKIV</span>
              </button>
            </div>

            {/* TAB 1: ALLOCATE PARALLEL CHANNELS */}
            {activeTab === "channels" && (
              <div className="p-6 bg-white border border-[#1A1A1A] space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A] uppercase">
                  <Layers className="w-4 h-4 text-[#D82C2C]" />
                  <span>Parallel Channel Allocation</span>
                </div>
                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed">
                  Post-quantum hash-tree signatures cannot share a single nonce without head-of-line blocking.
                  The SDK allocates unspent leaves and immediately records them as <strong>RESERVED</strong> in a write-ahead journal before signing.
                </p>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-mono text-[#A9B2B1] uppercase font-bold">
                    Channels to Allocate Simultaneously:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => setAllocateCount(num)}
                        className={`py-2 text-xs font-mono font-bold border transition-colors ${
                          allocateCount === num
                            ? "border-[#D82C2C] bg-[#D82C2C] text-white"
                            : "border-[#E2E6E6] bg-[#F2F2F2] text-[#1A1A1A] hover:bg-white"
                        }`}
                      >
                        {num} Channel{num > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-[#F2F2F2] border border-[#E2E6E6] font-mono text-[11px] space-y-1">
                  <div className="text-[#A9B2B1] font-bold">SDK Method:</div>
                  <div className="text-[#1A1A1A]">await manager.allocateParallelLeaves({allocateCount});</div>
                  <div className="text-emerald-700 font-semibold pt-1">
                    Invariant: Marked RESERVED locally before signing; immune to abandonment leaks.
                  </div>
                </div>

                <button
                  onClick={handleAllocate}
                  disabled={isAllocating}
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-[#D82C2C] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${isAllocating ? "animate-spin" : ""}`} />
                  <span>{isAllocating ? "Allocating Channels..." : `Allocate ${allocateCount} Leaf Channel(s)`}</span>
                </button>

                {userWallet ? (
                  <button
                    onClick={() => handleBroadcastLiveWalletTx(0)}
                    disabled={isBroadcasting}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <ArrowRight className={`w-3.5 h-3.5 ${isBroadcasting ? "animate-spin" : ""}`} />
                    <span>{isBroadcasting ? "Waiting for Wallet Approval..." : `Broadcast Frame Tx from ${userWallet.slice(0, 6)}...${userWallet.slice(-4)}`}</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-900 text-center">
                    Connect your wallet above to sign and broadcast real OTS frame transactions!
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SAFE FEE BUMP (RBF) */}
            {activeTab === "bump" && (
              <div className="p-6 bg-white border border-[#1A1A1A] space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D82C2C] uppercase">
                  <Flame className="w-4 h-4 text-[#D82C2C]" />
                  <span>Safe Fee-Bumping (Replace-By-Fee)</span>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed">
                  <strong>The Cryptographic Trap:</strong> In linear nonces, fee-bumping re-signs the replacement transaction under the same nonce.
                  For OTS keys, revealing a second signature under the same leaf key exposes hash-chain intersections and enables forgery!
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#A9B2B1] uppercase font-bold">
                    Select Leaf to Replace &amp; Burn:
                  </label>
                  <select
                    value={selectedLeafToBump}
                    onChange={(e) => setSelectedLeafToBump(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-[#1A1A1A] font-mono text-xs"
                  >
                    {leaves.map((l) => (
                      <option key={l.leafIndex.toString()} value={Number(l.leafIndex)}>
                        Leaf #{l.leafIndex.toString()} ({l.localState})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#A9B2B1] uppercase font-bold">
                    Escalation Reason:
                  </label>
                  <input
                    type="text"
                    value={bumpReason}
                    onChange={(e) => setBumpReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E2E6E6] font-mono text-xs"
                  />
                </div>

                <div className="p-3 bg-[#F2F2F2] border border-[#E2E6E6] font-mono text-[11px] space-y-1">
                  <div className="text-[#A9B2B1] font-bold">SDK Safe Action:</div>
                  <div className="text-[#1A1A1A]">await manager.bumpFee({selectedLeafToBump}, &quot;{bumpReason.slice(0, 20)}...&quot;);</div>
                  <div className="text-red-700 font-semibold pt-1">
                    Leaf #{selectedLeafToBump} &rarr; 🔴 BURNED forever. Fresh leaf allocated!
                  </div>
                </div>

                <button
                  onClick={handleFeeBump}
                  disabled={isBumping}
                  className="w-full py-3 bg-[#D82C2C] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Flame className={`w-4 h-4 ${isBumping ? "animate-spin" : ""}`} />
                  <span>{isBumping ? "Executing Safe Bump..." : `Burn Leaf #${selectedLeafToBump} & Allocate Replacement`}</span>
                </button>
              </div>
            )}

            {/* TAB 3: ZERO-STATE WALLET RECOVERY */}
            {activeTab === "recovery" && (
              <div className="p-6 bg-white border border-[#1A1A1A] space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A] uppercase">
                  <RotateCcw className="w-4 h-4 text-[#D82C2C]" />
                  <span>Zero-State Recovery with Safety Gap</span>
                </div>
                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed">
                  When restoring a wallet on a new device without local journals, an on-chain query cannot see transactions that were signed but dropped before block inclusion.
                  The SDK jumps forward by a <strong>Safety Gap (+16 leaves)</strong> past the highest mined leaf.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#A9B2B1] uppercase font-bold">
                      Scan Window (Leaves):
                    </label>
                    <input
                      type="number"
                      value={scanWindow}
                      onChange={(e) => setScanWindow(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-[#E2E6E6] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#A9B2B1] uppercase font-bold">
                      Safety Gap (+Leaves):
                    </label>
                    <input
                      type="number"
                      value={safetyGap}
                      onChange={(e) => setSafetyGap(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-[#E2E6E6] font-mono text-xs"
                    />
                  </div>
                </div>

                {recoveryResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 font-mono text-xs space-y-2">
                    <div className="text-emerald-900 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Recovery Calculation Complete:</span>
                    </div>
                    <div className="text-emerald-800 text-[11px] space-y-1">
                      <div>Highest Mined Leaf Detected: <strong>{recoveryResult.highestMined !== null ? `#${recoveryResult.highestMined}` : "None (Fresh account)"}</strong></div>
                      <div>Safety Skip-Ahead Gap Applied: <strong>+{safetyGap} Leaves</strong></div>
                      <div className="pt-1 text-[#1A1A1A] font-bold">Safe Resume Index: <span className="text-[#D82C2C]">Leaf #{recoveryResult.resumeIndex}</span></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRecovery}
                  disabled={isRecovering}
                  className="w-full py-3 bg-[#1A1A1A] hover:bg-black text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRecovering ? "animate-spin" : ""}`} />
                  <span>{isRecovering ? "Scanning Storage..." : "Simulate Zero-State Recovery"}</span>
                </button>
              </div>
            )}

            {/* TAB 4: MEMPOOL ADMISSION ROUTER */}
            {activeTab === "router" && (
              <div className="p-6 bg-white border border-[#1A1A1A] space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A] uppercase">
                  <Sliders className="w-4 h-4 text-[#D82C2C]" />
                  <span>Dynamic Mempool Admission Routing</span>
                </div>
                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed">
                  Evaluates verification gas envelope against canonical bounds (100k cap) and alternative mempool collateral requirements (2M cap).
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#A9B2B1] font-bold uppercase">Verification Gas:</span>
                    <span className="font-bold text-[#D82C2C]">{routerGas.toLocaleString()} GAS</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="2200000"
                    step="10000"
                    value={routerGas}
                    onChange={(e) => setRouterGas(Number(e.target.value))}
                    className="w-full accent-[#D82C2C]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#A9B2B1]">
                    <span>50k (Baseline)</span>
                    <span className="text-[#D82C2C] font-bold">100k (Canonical Cap)</span>
                    <span className="text-emerald-600 font-bold">2M (Alt-Mempool Cap)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F2F2F2] border border-[#E2E6E6] text-xs font-mono">
                  <span>Sender Staking Collateral:</span>
                  <button
                    onClick={() => setRouterIsStaked(!routerIsStaked)}
                    className={`px-3 py-1 font-bold transition-colors ${
                      routerIsStaked ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {routerIsStaked ? "STAKED (0.012 ETH)" : "UNSTAKED (0 ETH)"}
                  </button>
                </div>

                {/* Routing Output */}
                {routeDecision && (
                  <div
                    className={`p-4 border font-mono text-xs space-y-2 ${
                      routeDecision.admitted
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-red-50 border-red-300 text-red-950"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {routeDecision.admitted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>{routeDecision.admitted ? "ADMISSION GRANTED" : "TRANSACTION REJECTED"}</span>
                      </span>
                      <span className="uppercase px-2 py-0.5 bg-white border text-[10px]">
                        Target: {routeDecision.targetMempool}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{routeDecision.reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ARKIV DB-CHAIN EPHEMERAL JOURNAL */}
            {activeTab === "arkiv" && (
              <div className="p-6 bg-white border border-purple-900 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-950 uppercase">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span>Arkiv DB-Chain Ephemeral Journal</span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-mono font-bold border border-purple-200">
                    Rabdi #7794095
                  </span>
                </div>

                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed">
                  Post-quantum keys cannot be shared across multiple devices or bots without risking double-signing.
                  Q-Frame syncs the Write-Ahead Journal with <strong>Arkiv DB-Chain</strong> using native <strong>10-minute auto-expiring TTLs</strong>.
                  If a mempool transaction drops unmined, Arkiv automatically prunes the reservation—freeing the leaf without any central database!
                </p>

                <div className="p-3 bg-purple-50/70 border border-purple-200 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A9B2B1] uppercase font-bold">Arkiv Schema:</span>
                    <span className="font-bold text-purple-900">qframe.leaf-journal</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A9B2B1] uppercase font-bold">Expiration Rule:</span>
                    <span className="font-bold text-purple-900">ExpirationTime.fromMinutes(10)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A9B2B1] uppercase font-bold">Network:</span>
                    <a
                      href={ARKIV_EXPLORER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-600 underline font-bold flex items-center gap-1 hover:text-purple-800"
                    >
                      <span>Rabdi Testnet</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[#A9B2B1] uppercase font-bold">
                    Select Channel Leaf to Commit to Arkiv:
                  </label>
                  <select
                    value={selectedLeafForArkiv}
                    onChange={(e) => setSelectedLeafForArkiv(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-[#1A1A1A] font-mono text-xs font-bold"
                  >
                    {leaves.map((l, i) => (
                      <option key={i} value={i}>
                        Leaf #{l.leafIndex} (State: {l.localState}, NonceKey: 0x{l.nonceKey.toString(16).slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handlePublishToArkiv}
                    disabled={isArkivPublishing}
                    className="py-2.5 px-3 bg-purple-900 hover:bg-purple-950 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-300" />
                    <span>{isArkivPublishing ? "Publishing..." : "Commit (10m TTL)"}</span>
                  </button>
                  <button
                    onClick={handleQueryArkiv}
                    disabled={isArkivLoading}
                    className="py-2.5 px-3 bg-white border border-purple-900 text-purple-900 font-mono text-xs font-bold hover:bg-purple-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isArkivLoading ? "animate-spin" : ""}`} />
                    <span>Query Entities</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#E2E6E6] flex items-center justify-between text-[11px] font-mono">
                  <button
                    onClick={handleSwitchRabdi}
                    className="text-purple-700 hover:text-purple-900 underline font-bold flex items-center gap-1"
                  >
                    <span>Connect Rabdi to MetaMask</span>
                  </button>
                  <a
                    href={ARKIV_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#D82C2C] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Claim tGLM Faucet</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {/* Arkiv Entities List */}
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-mono text-[#A9B2B1] uppercase font-bold flex items-center justify-between">
                    <span>Live Arkiv DB-Chain Records ({arkivEntities.length})</span>
                    <span className="text-purple-600">Auto-Pruned after Expiration</span>
                  </div>
                  {arkivEntities.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 font-mono text-[11px] text-center italic">
                      No active Arkiv entities found for this account. Click "Commit (10m TTL)" or "Query Entities".
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
                      {arkivEntities.map((ent, idx) => (
                        <div key={idx} className="p-2 bg-purple-50 border border-purple-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-purple-950 text-[11px]">Leaf #{ent.leafIndex} • {ent.action}</div>
                            <div className="text-[9px] text-[#A9B2B1] truncate max-w-[180px]" title={ent.key}>Key: {ent.key}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded">
                              {ent.status}
                            </span>
                            {ent.expiresAtBlock && (
                              <div className="text-[9px] text-purple-600 mt-0.5">Exp: Blk #{ent.expiresAtBlock}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Write-Ahead Journal Viewer */}
            <div className="p-4 bg-[#1A1A1A] text-white border border-[#1A1A1A] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="font-bold uppercase text-[11px] text-[#A9B2B1] flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#D82C2C]" />
                  <span>Write-Ahead Journal ({journal.length} entries)</span>
                </span>
                <span className="text-[10px] text-emerald-400">Local Invariant Engine</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px] pr-1">
                {journal.length === 0 ? (
                  <div className="text-white/40 italic py-2">No local reservations or burns yet. Click Allocate or Safe Bump to test.</div>
                ) : (
                  journal.map((entry) => (
                    <div
                      key={`${entry.leafIndex}-${entry.timestamp}`}
                      className="p-2 bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">Leaf #{entry.leafIndex}</span>
                        <span className="text-white/50 text-[10px] ml-2">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        {entry.reason && <div className="text-[10px] text-white/70 italic mt-0.5">{entry.reason}</div>}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 uppercase ${
                          entry.state === "RESERVED"
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : "bg-red-500/20 text-red-400 border border-red-500/40"
                        }`}
                      >
                        {entry.state}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Channel Grid (Leaves 0..11) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-[#F2F2F2] border border-[#1A1A1A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E6E6] pb-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A] uppercase">
                  <Key className="w-4 h-4 text-[#D82C2C]" />
                  <span>EIP-8250 2D Keyed Nonce Channels (Leaves 0..11)</span>
                </div>
                <div className="text-[11px] font-mono text-[#A9B2B1]">
                  Formula: <code className="text-[#1A1A1A]">keccak256(domain || leafIndex)</code>
                </div>
              </div>

              {/* 12 Channels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {leaves.map((l) => {
                  const leafNum = Number(l.leafIndex);
                  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
                  if (l.localState === "MINED") badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-400";
                  if (l.localState === "RESERVED") badgeStyle = "bg-amber-100 text-amber-800 border-amber-400";
                  if (l.localState === "BURNED") badgeStyle = "bg-red-100 text-red-800 border-red-400";

                  return (
                    <div
                      key={l.leafIndex.toString()}
                      className={`p-3 border font-mono transition-all ${
                        l.localState === "MINED"
                          ? "bg-white border-emerald-500 shadow-sm"
                          : l.localState === "RESERVED"
                          ? "bg-amber-50/50 border-amber-500 shadow-sm"
                          : l.localState === "BURNED"
                          ? "bg-red-50/40 border-red-400 opacity-75"
                          : "bg-white border-[#E2E6E6] hover:border-[#1A1A1A]"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E6]">
                        <span className="font-bold text-xs text-[#1A1A1A]">Leaf #{l.leafIndex.toString()}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 border uppercase ${badgeStyle}`}>
                          {l.localState}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-[10px] text-[#A9B2B1]">
                        <div className="flex justify-between">
                          <span>On-Chain Seq:</span>
                          <span className={`font-bold ${l.onChainSequence > 0n ? "text-emerald-700" : "text-[#1A1A1A]"}`}>
                            {l.onChainSequence.toString()}
                          </span>
                        </div>
                        <div className="flex justify-between truncate" title={`0x${l.nonceKey.toString(16)}`}>
                          <span>NonceKey:</span>
                          <span className="text-[#1A1A1A] font-bold">
                            0x{l.nonceKey.toString(16).slice(0, 4)}...{l.nonceKey.toString(16).slice(-4)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E2E6E6] flex gap-1 justify-between">
                        <button
                          onClick={() => {
                            setSelectedLeafToBump(leafNum);
                            setActiveTab("bump");
                          }}
                          className="text-[9px] px-1.5 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D82C2C] hover:text-white transition-colors"
                        >
                          Safe Bump
                        </button>
                        <button
                          onClick={() => copyToClipboard(`0x${l.nonceKey.toString(16)}`, `key-${l.leafIndex}`)}
                          className="text-[9px] px-1.5 py-1 bg-[#F2F2F2] border border-[#E2E6E6] text-[#1A1A1A] hover:bg-white transition-colors flex items-center gap-1"
                          title="Copy Nonce Key"
                        >
                          {copiedText === `key-${l.leafIndex}` ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live SDK Terminal Output */}
            <div className="p-4 bg-[#1A1A1A] text-white border border-[#1A1A1A] font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <span className="font-bold uppercase text-[11px] text-[#A9B2B1] flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SDK Execution Telemetry</span>
                </span>
                <span className="text-[10px] text-white/50">Hegot&aacute; Devnet JSON-RPC</span>
              </div>
              <div className="h-44 overflow-y-auto space-y-1 text-[11px] text-emerald-400 pr-1">
                {consoleLogs.map((log, i) => (
                  <div key={i} className="leading-tight">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
