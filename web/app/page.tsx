"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import {
  ShieldCheck,
  Cpu,
  Layers,
  ArrowUpRight,
  Terminal,
  Sliders,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Database,
  GitBranch,
  BookOpen,
  Wallet,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  Flame,
  RotateCcw,
} from "lucide-react";
import { useWallet } from "./context/WalletContext";
import { useMounted } from "./hooks/useMounted";

export default function Home() {
  const isMounted = useMounted();
  const { walletAddress, setIsWalletModalOpen } = useWallet();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white text-[#1A1A1A] flex flex-col font-sans">
        <div className="h-16 bg-white border-b border-[#E2E6E6]" />
        <div className="flex-1 max-w-[1280px] mx-auto px-6 py-12 animate-pulse space-y-8 w-full">
          <div className="h-8 bg-[#F2F2F2] w-48" />
          <div className="h-12 bg-[#F2F2F2] w-96" />
          <div className="h-64 bg-[#F2F2F2] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] flex flex-col font-sans selection:bg-[#D82C2C] selection:text-white">
      {/* Universal Shared Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* ─────────────────────────────────────────────────────────────
            1. HERO SECTION (ASYMMETRICAL 12-COL GRID)
        ───────────────────────────────────────────────────────────── */}
        <section className="relative swiss-border-b overflow-hidden bg-white">
          <div className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] leading-[1.05]">
                POST-QUANTUM <br />
                <span className="text-[#D82C2C]">FRAME TRANSACTIONS</span> <br />
                ON ALTERNATIVE MEMPOOLS.
              </h1>

              <p className="text-base sm:text-lg text-[#1A1A1A]/85 max-w-xl leading-relaxed">
                Standard-size post-quantum signature schemes (NIST FIPS 204/205) demand over <strong>200,000 to 1,500,000 gas</strong>, 
                exceeding the canonical 100k mempool validation wall. <strong>Q-Frame</strong> empirically benchmarks 
                <strong> EIP-8141</strong> execution frames and <strong>ERC-8421</strong> alternative mempools to safely accommodate high-budget verification up to <strong>2,000,000 gas</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/simulator"
                  className="btn-swiss-primary px-6 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 cursor-pointer"
                >
                  <span>Interactive Gas Simulator</span>
                  <Sliders className="w-4 h-4" />
                </Link>
                <Link
                  href="/studio"
                  className="btn-swiss-secondary px-6 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 cursor-pointer"
                >
                  <span>Launch SDK Studio</span>
                  <ArrowRight className="w-4 h-4 text-[#D82C2C]" />
                </Link>
                <a
                  href="#evidence"
                  className="text-xs font-swiss-mono font-bold text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors flex items-center gap-1"
                >
                  <span>Inspect On-Chain Proof &darr;</span>
                </a>
              </div>

              {/* Technical Spec Matrix Ticker */}
              <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 swiss-border-t text-xs font-swiss-mono">
                <div>
                  <div className="text-[#A9B2B1] uppercase text-[10px]">Verification Target</div>
                  <div className="font-bold text-[#1A1A1A] mt-1">NIST FIPS 205 (SLH-DSA)</div>
                </div>
                <div>
                  <div className="text-[#A9B2B1] uppercase text-[10px]">Validation Hook</div>
                  <div className="font-bold text-[#1A1A1A] mt-1">APPROVE (0xAA) Opcode</div>
                </div>
                <div>
                  <div className="text-[#A9B2B1] uppercase text-[10px]">Staked Gas Ceiling</div>
                  <div className="font-bold text-[#D82C2C] mt-1">2,000,000 GAS (+1,900%)</div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns (Swiss Abstract Poster & Diagnostic Matrix) */}
            <div className="lg:col-span-5 bg-[#1A1A1A] text-white p-6 sm:p-8 rounded-none border-2 border-[#1A1A1A] shadow-sm relative">
              <div className="flex items-center justify-between swiss-border-b pb-4 mb-6 text-xs font-swiss-mono text-[#A9B2B1]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#D82C2C]" />
                  <span>DIAGNOSTIC PROTOCOL SPEC</span>
                </div>
                <span>REV. 2026.11</span>
              </div>

              <div className="space-y-5 font-swiss-mono text-xs">
                <div className="p-3 bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[#A9B2B1] text-[10px]">EIP-8141 EXECUTION ENVELOPE</div>
                  <div className="text-[#F2F2F2] font-semibold">TYPE: 0x06 (Frame Transaction)</div>
                  <div className="text-emerald-400">FRAME 0: VERIFY (PQBenchmarkAccount)</div>
                  <div className="text-emerald-400">FRAME 1: PAY (APPROVE 0xAA)</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 border border-white/10">
                    <div className="text-[#A9B2B1] text-[10px]">CANONICAL MEMPOOL</div>
                    <div className="text-red-400 font-bold text-sm mt-1">100,000 GAS</div>
                    <div className="text-[#A9B2B1] text-[10px] mt-0.5">Strict Hard Ceiling</div>
                  </div>
                  <div className="p-3 bg-[#D82C2C]/15 border border-[#D82C2C]/40">
                    <div className="text-[#D82C2C] text-[10px] font-bold">ERC-8421 STAKED</div>
                    <div className="text-white font-bold text-sm mt-1">2,000,000 GAS</div>
                    <div className="text-[#A9B2B1] text-[10px] mt-0.5">Staked Entity Limit</div>
                  </div>
                </div>

                <div className="p-3 bg-black/40 border border-white/10 text-[11px] leading-relaxed text-[#A9B2B1]">
                  <span className="text-white font-semibold">Mathematical Proof: </span>
                  Standard ECDSA requires ~3,000 gas. SLH-DSA hash iterations require 259,247 gas. 
                  Without ERC-8421 stake bonding, any post-quantum transaction is immediately discarded by nodes 
                  as an uncompensated DoS vector.
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-[#A9B2B1]">
                  <span>FOUNDRY TEST SUITE</span>
                  <span className="text-emerald-400 font-bold">13 / 13 PASSED (100%)</span>
                </div>
              </div>

              {/* Swiss Red Corner Badge */}
              <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-[#D82C2C] text-white flex items-center justify-center font-bold text-xs">
                +
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            2. LIVE ON-CHAIN DEPLOYMENT BLOCK (VERIFIED EVIDENCE)
        ───────────────────────────────────────────────────────────── */}
        <section id="evidence" className="py-12 bg-[#F2F2F2] swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                  02 / VERIFIED ON-CHAIN ARTIFACT
                </div>
                <h2 className="text-2xl font-bold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
                  Live Contract Deployment Evidence
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-swiss-mono px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  BLOCK #1317596 &middot; STATUS: 0x1 MINED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Address Card */}
              <div className="bg-white p-5 swiss-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-swiss-mono text-[#A9B2B1] mb-2">
                  <span>PQBenchmarkAccount Contract</span>
                  <span>Solidity 0.8.24</span>
                </div>
                <div className="font-swiss-mono text-sm sm:text-base font-bold text-[#1A1A1A] break-all my-2">
                  0xe5c5A34833db3A90E30adCD98f2955E36496483B
                </div>
                <div className="flex items-center gap-3 pt-2 text-xs font-swiss-mono">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "0xe5c5A34833db3A90E30adCD98f2955E36496483B",
                        "account"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1A1A] text-white hover:bg-[#D82C2C] transition-colors cursor-pointer"
                  >
                    {copiedKey === "account" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY ADDRESS</span>
                      </>
                    )}
                  </button>
                  <a
                    href="https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#F2F2F2] border border-[#A9B2B1]/50 text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors cursor-pointer"
                  >
                    <span>View on Dora Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[#A9B2B1]">Gas Used: 7,264,101</span>
                </div>
              </div>

              {/* Transaction Hash Card */}
              <div className="bg-white p-5 swiss-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-swiss-mono text-[#A9B2B1] mb-2">
                  <span>Broadcast Transaction Hash</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold">Success</span>
                </div>
                <div className="font-swiss-mono text-sm sm:text-base font-bold text-[#1A1A1A] break-all my-2">
                  0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-swiss-mono">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36",
                        "tx"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1A1A] text-white hover:bg-[#D82C2C] transition-colors cursor-pointer"
                  >
                    {copiedKey === "tx" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY TX HASH</span>
                      </>
                    )}
                  </button>
                  <a
                    href="https://dora.hegota.ethrex.xyz/tx/0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer font-bold"
                  >
                    <span>View on Dora Explorer</span>
                    <ExternalLink className="w-3 h-3 text-[#D82C2C]" />
                  </a>
                </div>
              </div>
            </div>

            {/* 60-Second Onboarding Guide */}
            <div className="mt-8 bg-[#1A1A1A] text-white p-6 md:p-8 swiss-border relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-5 mb-6">
                <div>
                  <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#D82C2C] inline-block" />
                    <span>JUDGE &amp; REVIEWER ONBOARDING GUIDE</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold font-swiss-display mt-1">
                    How to Evaluate &amp; Test Q-Frame in 60 Seconds
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-swiss-mono px-3 py-1 bg-white/10 text-[#A9B2B1] border border-white/20">
                    EIP-8141 &amp; ERC-8421
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-swiss-mono">
                {/* Step 1 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">01 / CONNECT DEVNET WALLET</div>
                    <p className="text-[#A9B2B1] leading-relaxed font-sans text-xs">
                      Connect your MetaMask, Coinbase Wallet, or Rabby. Our 1-click network switcher automatically configures the 
                      Hegot&aacute; Frame Devnet (<code className="text-white">Chain 3151908</code>) with native EIP-8141 opcode support.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="w-full py-2 bg-[#D82C2C] hover:bg-[#b02222] text-white font-bold transition-colors cursor-pointer text-center mt-2 flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{walletAddress ? "WALLET CONNECTED" : "CONNECT IN 1-CLICK"}</span>
                  </button>
                </div>

                {/* Step 2 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">02 / SIMULATE GAS CEILINGS</div>
                    <p className="text-[#A9B2B1] leading-relaxed font-sans text-xs">
                      Open the interactive Gas Simulator. Drag the slider to 259,247 gas (NIST SLH-DSA). 
                      Watch how the canonical mempool drops it, and how depositing 0.012 ETH stake admits it.
                    </p>
                  </div>
                  <Link
                    href="/simulator"
                    className="w-full py-2 bg-white text-[#1A1A1A] hover:bg-[#F2F2F2] font-bold transition-colors text-center mt-2 flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>OPEN GAS SIMULATOR &rarr;</span>
                  </Link>
                </div>

                {/* Step 3 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">03 / TEST LEAFMANAGER SDK</div>
                    <p className="text-[#A9B2B1] leading-relaxed font-sans text-xs">
                      Open the LeafManager Studio. Allocate parallel leaf channels, execute safe key-burning fee bumps, 
                      and inspect live EIP-8250 storage slots directly from your connected wallet.
                    </p>
                  </div>
                  <Link
                    href="/studio"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-center mt-2 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>OPEN SDK STUDIO &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. DEDICATED TOOL SUITE PORTALS: SIMULATOR & SDK STUDIO
        ───────────────────────────────────────────────────────────── */}
        <section className="py-20 bg-white swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-12">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                03 / INTERACTIVE PROTOCOL TOOLS &amp; DEVELOPER SUITE
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
                Explore the Protocol Tools &amp; Implementation
              </h2>
              <p className="text-sm sm:text-base text-[#1A1A1A]/70 max-w-2xl mt-1">
                Deep dive into real-time cryptographic gas physics or test the full stateful One-Time Signature (OTS) client SDK.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Tool 1: Gas Simulator Portal */}
              <div className="bg-[#F2F2F2] p-8 swiss-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono px-2.5 py-1 bg-[#1A1A1A] text-white font-bold uppercase">
                      MATHEMATICAL TOOL
                    </span>
                    <span className="text-xs font-swiss-mono text-[#D82C2C] font-bold">
                      NIST FIPS 205 (SLH-DSA)
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold font-swiss-display text-[#1A1A1A]">
                    Post-Quantum Gas Simulator
                  </h3>

                  <p className="text-xs sm:text-sm text-[#1A1A1A]/75 leading-relaxed font-sans">
                    Dynamically sweep hash-chain parameters against native EIP-8141 execution frames.
                    Visualize why NIST post-quantum verification requires <strong>259,247 gas</strong>, causing canonical mempools to drop it at the 100k wall, and see how ERC-8421 collateral unlocks up to <strong>2,000,000 gas</strong>.
                  </p>

                  <div className="p-4 bg-white font-swiss-mono text-xs space-y-2 swiss-border">
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>CANONICAL CEILING:</span>
                      <span className="text-[#1A1A1A] font-bold">100,000 GAS (Hard Wall)</span>
                    </div>
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>STAKED MEMPOOL CEILING:</span>
                      <span className="text-emerald-700 font-bold">2,000,000 GAS (+1,900%)</span>
                    </div>
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>MINIMUM STAKE:</span>
                      <span className="text-[#D82C2C] font-bold">0.012 ETH (86,400s delay)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[#E2E6E6]">
                  <Link
                    href="/simulator"
                    className="w-full py-3.5 bg-[#1A1A1A] hover:bg-[#D82C2C] text-white font-swiss-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Launch Gas Simulator &rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Tool 2: SDK Studio Portal */}
              <div className="bg-[#F2F2F2] p-8 swiss-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono px-2.5 py-1 bg-[#D82C2C] text-white font-bold uppercase">
                      CLIENT SDK SUITE
                    </span>
                    <span className="text-xs font-swiss-mono text-[#1A1A1A] font-bold">
                      EIP-8250 KEYED NONCES
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold font-swiss-display text-[#1A1A1A]">
                    LeafManager SDK Studio
                  </h3>

                  <p className="text-xs sm:text-sm text-[#1A1A1A]/75 leading-relaxed font-sans">
                    The complete developer playground and integration guide for stateful One-Time Signature (OTS) keys.
                    Explore the <strong>12-channel leaf matrix</strong>, live devnet storage slot inspection, write-ahead journals, safe key-burning fee bumps, and zero-state recovery.
                  </p>

                  <div className="p-4 bg-white font-swiss-mono text-xs space-y-2 swiss-border">
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>KEY MANAGEMENT:</span>
                      <span className="text-[#1A1A1A] font-bold">12 Parallel OTS Channels</span>
                    </div>
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>PREDEPLOY BINDING:</span>
                      <span className="text-blue-700 font-bold">0x...8250 NonceManager</span>
                    </div>
                    <div className="flex justify-between items-center text-[#A9B2B1]">
                      <span>CRASH RECOVERY:</span>
                      <span className="text-emerald-700 font-bold">+16 Leaf Safety Gap</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[#E2E6E6]">
                  <Link
                    href="/studio"
                    className="w-full py-3.5 bg-[#D82C2C] hover:bg-[#b02222] text-white font-swiss-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Launch SDK Studio &amp; Dev Guide &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. FOUNDRY TEST BENCHMARKS CALIBRATION TABLE
        ───────────────────────────────────────────────────────────── */}
        <section id="benchmarks" className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-10">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              04 / EMPIRICAL DATA
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
              Foundry Test Calibration Curves
            </h2>
            <p className="text-sm text-[#1A1A1A]/70 max-w-xl mt-1">
              Direct telemetry from <code className="text-xs bg-[#F2F2F2] px-1 py-0.5 font-mono">contracts/test/GasCurveTest.t.sol</code> passing 13 / 13 tests.
            </p>
          </div>

          <div className="overflow-x-auto swiss-border">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-swiss-mono">
              <thead>
                <tr className="bg-[#1A1A1A] text-white">
                  <th className="p-4 border-r border-white/20">CONFIG PROFILE</th>
                  <th className="p-4 border-r border-white/20">CHAINS &times; ITERS</th>
                  <th className="p-4 border-r border-white/20">VERIFICATION GAS</th>
                  <th className="p-4 border-r border-white/20">CANONICAL (100K)</th>
                  <th className="p-4">STAKED ALT MEMPOOL (1M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6E6]">
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">NIST Minimal Bound</td>
                  <td className="p-4 border-r border-[#E2E6E6]">4 &times; 10</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">66,847 Gas</td>
                  <td className="p-4 text-emerald-600 font-bold border-r border-[#E2E6E6]">Admitted</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted</td>
                </tr>
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">Threshold Cross</td>
                  <td className="p-4 border-r border-[#E2E6E6]">8 &times; 15</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">126,047 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted</td>
                </tr>
                <tr className="bg-[#D82C2C]/5 font-semibold hover:bg-[#D82C2C]/10 transition-colors">
                  <td className="p-4 border-r border-[#E2E6E6] text-[#D82C2C]">
                    &starf; Q-Frame Calibrated (FIPS 205)
                  </td>
                  <td className="p-4 border-r border-[#E2E6E6] text-[#D82C2C]">15 &times; 20</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6] text-[#D82C2C]">
                    259,247 Gas
                  </td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">
                    Rejected (Hard Wall)
                  </td>
                  <td className="p-4 text-emerald-600 font-bold">
                    Admitted &amp; Mined (Target)
                  </td>
                </tr>
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">High-Security SPHINCS+</td>
                  <td className="p-4 border-r border-[#E2E6E6]">20 &times; 30</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">481,247 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted (Safely &lt;1M)</td>
                </tr>
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">Stress Max Limit</td>
                  <td className="p-4 border-r border-[#E2E6E6]">30 &times; 40</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">925,247 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted (Peak Limit)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. PRICING / STAKING & VERIFICATION TIERS (3 TIERS)
        ───────────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 bg-[#F2F2F2] swiss-border-t swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                05 / ECONOMIC INCENTIVE DESIGN
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
                Mempool Staking &amp; Verification Tiers
              </h2>
              <p className="text-sm text-[#1A1A1A]/70 mt-2">
                Under ERC-8421, mempool admission is not free: senders bond ETH in the registry 
                to buy higher gas allowances while deterring spam.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* Tier 1: Canonical */}
              <div className="bg-white p-8 swiss-border flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-swiss-mono text-[#A9B2B1] uppercase font-semibold">
                    STANDARD TIER
                  </div>
                  <h3 className="text-xl font-bold font-swiss-display text-[#1A1A1A] mt-1">
                    Canonical Mempool
                  </h3>
                  <div className="mt-4 pb-6 swiss-border-b">
                    <span className="text-4xl font-extrabold font-swiss-display text-[#1A1A1A]">0</span>
                    <span className="text-sm font-swiss-mono text-[#A9B2B1] ml-1">ETH Stake</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs font-swiss-mono text-[#1A1A1A]/80">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>Max 100,000 Validation Gas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>ECDSA secp256k1 Only</span>
                    </li>
                    <li className="flex items-center gap-2 text-[#D82C2C]">
                      <span className="w-1.5 h-1.5 bg-[#D82C2C]" />
                      <span>Zero Post-Quantum Support</span>
                    </li>
                    <li className="flex items-center gap-2 text-[#A9B2B1]">
                      <span className="w-1.5 h-1.5 bg-[#A9B2B1]" />
                      <span>Unbonded DoS Protection</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <button
                    disabled
                    className="w-full py-3 text-xs font-swiss-mono bg-[#F2F2F2] text-[#A9B2B1] cursor-not-allowed font-semibold"
                  >
                    DEFAULT PROTOCOL
                  </button>
                </div>
              </div>

              {/* Tier 2: Q-Frame Staked (HIGHLIGHTED) */}
              <div className="bg-[#1A1A1A] text-white p-8 border-2 border-[#D82C2C] flex flex-col justify-between shadow-lg relative transform -translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#D82C2C] text-white text-[10px] font-swiss-mono font-bold uppercase tracking-wider">
                  RECOMMENDED FOR POST-QUANTUM
                </div>
                <div>
                  <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-semibold">
                    Q-FRAME BENCHMARK TIER
                  </div>
                  <h3 className="text-2xl font-bold font-swiss-display text-white mt-1">
                    Staked Alt Mempool
                  </h3>
                  <div className="mt-4 pb-6 border-b border-white/20">
                    <span className="text-4xl font-extrabold font-swiss-display text-white">0.012</span>
                    <span className="text-sm font-swiss-mono text-white/60 ml-1">ETH Stake</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs font-swiss-mono text-white/90">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#D82C2C]" />
                      <span className="font-bold">2,000,000 Validation Gas (+1,900%)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#D82C2C]" />
                      <span>NIST FIPS 205 (SPHINCS+)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#D82C2C]" />
                      <span>EIP-8141 Frame Transactions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#D82C2C]" />
                      <span>NaiveStakingRegistry Slasher</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/simulator"
                    className="w-full block text-center py-3.5 text-xs font-swiss-mono bg-[#D82C2C] hover:bg-[#b02222] text-white font-bold transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Simulate Staked Flow &rarr;
                  </Link>
                </div>
              </div>

              {/* Tier 3: Enterprise Sequencer */}
              <div className="bg-white p-8 swiss-border flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-swiss-mono text-[#A9B2B1] uppercase font-semibold">
                    HIGH-THROUGHPUT TIER
                  </div>
                  <h3 className="text-xl font-bold font-swiss-display text-[#1A1A1A] mt-1">
                    Sequencer Relayer
                  </h3>
                  <div className="mt-4 pb-6 swiss-border-b">
                    <span className="text-4xl font-extrabold font-swiss-display text-[#1A1A1A]">0.100</span>
                    <span className="text-sm font-swiss-mono text-[#A9B2B1] ml-1">ETH Stake</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs font-swiss-mono text-[#1A1A1A]/80">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>5,000,000 Validation Gas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>Full Lattice / Falcon Signature Loops</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>Zero-Knowledge Batch Rollups</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#1A1A1A]" />
                      <span>High Reputation Quota Buffer</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <button
                    disabled
                    className="w-full py-3 text-xs font-swiss-mono bg-[#F2F2F2] text-[#A9B2B1] cursor-not-allowed font-semibold"
                  >
                    FUTURE EXPANSION
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. TESTIMONIALS / PROTOCOL RESEARCH CITATIONS
        ───────────────────────────────────────────────────────────── */}
        <section className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-12">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              06 / SCIENTIFIC CONTEXT
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
              Cryptographic Standards &amp; Framework Citations
            </h2>
            <p className="text-sm text-[#1A1A1A]/70 max-w-xl mt-1">
              Grounding Q-Frame within official NIST standards and Ethereum Foundation specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Citation 1: NIST FIPS 205 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed font-sans">
                &ldquo;Stateless hash-based signatures standardized in NIST FIPS 205 (SLH-DSA) guarantee security against quantum computers, but require evaluating deep hash trees that far exceed existing blockchain validation bounds.&rdquo;
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">NIST FIPS 205</div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] font-semibold">Post-Quantum Cryptography Standard</div>
                <div className="text-[11px] font-swiss-mono text-[#1A1A1A]/70 mt-1">
                  <strong>Authors:</strong> D. Cooper, D. Apon, R. Perlner, A. Robinson, C. Miller (NIST) · SPHINCS+ Designers: D.J. Bernstein, P. Schwabe et al.
                </div>
              </div>
            </div>

            {/* Citation 2: EIP-8141 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed font-sans">
                &ldquo;EIP-8141 introduces frame transactions so verification, execution, and gas sponsorship are decoupled. The APPROVE opcode formalizes valid authorization without requiring full account abstraction predeploys.&rdquo;
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">EIP-8141 Spec</div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] font-semibold">Frame Transactions Core Draft</div>
                <div className="text-[11px] font-swiss-mono text-[#1A1A1A]/70 mt-1">
                  <strong>Authors:</strong> Vitalik Buterin, Yoav Weiss, Alex Forshtat, Dror Tirosh, Shahaf Nacson
                </div>
              </div>
            </div>

            {/* Citation 3: ERC-8421 & Ethrex */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed font-sans">
                &ldquo;ERC-8421 establishes alternative mempools with reputation staking. By holding economic stake in a registry contract, participants protect nodes from uncompensated computation.&rdquo;
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">ERC-8421 &amp; Ethrex</div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] font-semibold">LambdaClass &amp; EF Research</div>
                <div className="text-[11px] font-swiss-mono text-[#1A1A1A]/70 mt-1">
                  <strong>Authors:</strong> Federico Carrone &amp; LambdaClass Team · Ethereum Foundation Research
                </div>
              </div>
            </div>

            {/* Citation 4: Arkiv DB-Chain & EIP-8250 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed font-sans">
                &ldquo;Decentralized Write-Ahead Journals with native block-based expiration ensure multi-device OTS key coordination, preventing post-quantum double-signing without a central database.&rdquo;
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">Arkiv DB-Chain &amp; EIP-8250</div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] font-semibold">Time-Scoped Decentralized State</div>
                <div className="text-[11px] font-swiss-mono text-[#1A1A1A]/70 mt-1">
                  <strong>Authors:</strong> Arkiv Network Architecture Team · Golem Factory
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            7. FINAL IMPACTFUL CTA (SWISS ASYMMETRICAL POSTER)
        ───────────────────────────────────────────────────────────── */}
        <section className="bg-[#1A1A1A] text-white py-16 px-6 relative overflow-hidden">
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-block px-2.5 py-1 bg-[#D82C2C] text-white text-xs font-swiss-mono font-bold">
                POST-QUANTUM PROTOCOL SPECIFICATION
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-swiss-display leading-tight">
                VERIFIABLE POST-QUANTUM READINESS FOR ETHEREUM.
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-xl">
                Code authored from scratch, 100% passing test suites, and live on-chain deployment on the Hegot&aacute; Ethrex Devnet.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link
                href="/simulator"
                className="btn-swiss-primary text-center px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Launch Gas Simulator &rarr;
              </Link>
              <Link
                href="/studio"
                className="btn-swiss-secondary border-white text-white hover:bg-white hover:text-[#1A1A1A] text-center px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Launch SDK Studio &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Universal Shared Footer */}
      <Footer />
    </div>
  );
}
