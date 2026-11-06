"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LeafManagerStudio from "../components/LeafManagerStudio";
import { useWallet } from "../context/WalletContext";
import { useMounted } from "../hooks/useMounted";
import {
  Layers,
  ShieldCheck,
  Flame,
  RotateCcw,
  Zap,
  ArrowLeft,
  Copy,
  Check,
  Code2,
  BookOpen,
  AlertTriangle,
  FileCode,
  Terminal,
  Database,
} from "lucide-react";

export default function StudioPage() {
  const isMounted = useMounted();
  const { walletAddress } = useWallet();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
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

  const snippetInit = `import { LeafManager } from "q-frame-sdk";

// Initialize the SDK with Devnet configuration
const manager = new LeafManager({
  rpcUrl: "https://rpc1.hegota.ethrex.xyz",
  walletAddress: "0xd886...e354",
  canonicalCap: 100_000,
  altMempoolCap: 2_000_000,
});`;

  const snippetAllocate = `// Allocate 3 parallel leaf channels concurrently
// Invariant: Immediately journaled as RESERVED before signing
const allocatedLeaves = await manager.allocateParallelLeaves(3);

console.log("Allocated leaf channels:", allocatedLeaves.map(l => l.leafIndex));
// => [0n, 1n, 2n]`;

  const snippetBump = `// Replace-by-fee (RBF) with zero key-reuse risk
// THE TRAP: Never re-sign under the same OTS leaf key!
// THE FIX: Burn the stuck leaf key permanently and allocate a fresh replacement.
const replacementLeaf = await manager.bumpFee(
  0n, 
  "Mempool gas price escalation (+25% tip)"
);

console.log("Burned Leaf #0. New active leaf is #", replacementLeaf.leafIndex);`;

  const snippetRouter = `// Evaluates verification cost against mempool ceilings
// SLH-DSA post-quantum verification takes 259,247 gas
const route = manager.routeMempool(259_247, isUserStaked);

if (route.targetMempool === "alt-mempool") {
  console.log("Routed to ERC-8421 Staked Alt-Mempool (admitted up to 2M gas)");
} else {
  console.log("Routed to Canonical Mempool (100k gas wall)");
}`;

  const snippetArkiv = `// Ephemeral OTS leaf coordination on Arkiv DB-Chain
// Prevents cross-device double-signing with native 10m TTL
import { publishArkivReservation, fetchArkivReservations } from "q-frame-sdk/arkiv";

// 1. Commit ephemeral leaf reservation with automatic 10-minute TTL
await publishArkivReservation(walletAddress, 0, nonceKey, "RESERVE");

// 2. Query active reservations across all user devices
const activeEntities = await fetchArkivReservations(walletAddress);
console.log("Active Arkiv reservations:", activeEntities.length);`;

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] flex flex-col font-sans selection:bg-[#D82C2C] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 bg-[#F2F2F2] swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-swiss-mono font-bold text-[#A9B2B1] hover:text-[#1A1A1A] mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO SPECIFICATION</span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#D82C2C] inline-block" />
                  <span>SECTION 04 / CLIENT ARCHITECTURE &amp; DEVELOPER SUITE</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
                  LeafManager SDK Studio
                </h1>
                <p className="text-sm md:text-base text-[#1A1A1A]/75 max-w-3xl mt-2 leading-relaxed">
                  The client-side safety SDK managing stateful One-Time Signature (OTS) post-quantum keys across 
                  two-dimensional EIP-8250 keyed nonces and ERC-8421 alternative mempools.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-swiss-mono px-3 py-1.5 bg-[#1A1A1A] text-white font-bold">
                  PACKAGE: q-frame-sdk v0.1.0
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 1. WHY IS THE PLAYGROUND DESIGNED LIKE THIS? */}
        <section className="py-16 max-w-[1280px] mx-auto px-6">
          <div className="mb-10">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              01 / FUNDAMENTAL ARCHITECTURAL PRINCIPLES
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
              Why Does Post-Quantum Ethereum Need This SDK?
            </h2>
            <p className="text-sm sm:text-base text-[#1A1A1A]/70 max-w-2xl mt-1 leading-relaxed">
              Standard wallets like MetaMask assume ECDSA keys can sign infinite transactions. Post-quantum hash-tree signatures break this assumption completely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 text-xs font-swiss-mono">
            {/* Card 1: The 12-Leaf Matrix */}
            <div className="p-5 bg-white swiss-border flex flex-col justify-between space-y-3">
              <div>
                <div className="w-8 h-8 bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3 border border-amber-300">
                  <Layers className="w-4 h-4 text-amber-700" />
                </div>
                <h3 className="font-bold text-sm text-[#1A1A1A] font-swiss-display">
                  1. The 12-Leaf Matrix
                </h3>
                <p className="text-[#A9B2B1] mt-2 leading-relaxed font-sans text-xs">
                  Post-quantum signatures (SPHINCS+ / Winternitz) use hash trees composed of single-use <strong>Leaves</strong>.
                  Signing twice with the same leaf exposes hash preimages, allowing anyone to mathematically forge your signature.
                </p>
              </div>
              <div className="p-2 bg-amber-50 text-amber-900 border border-amber-200 text-[11px]">
                Rule: 1 Leaf = Exactly 1 Signature.
              </div>
            </div>

            {/* Card 2: EIP-8250 Keyed Nonces */}
            <div className="p-5 bg-white swiss-border flex flex-col justify-between space-y-3">
              <div>
                <div className="w-8 h-8 bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-3 border border-blue-300">
                  <Zap className="w-4 h-4 text-blue-700" />
                </div>
                <h3 className="font-bold text-sm text-[#1A1A1A] font-swiss-display">
                  2. Parallel Channels
                </h3>
                <p className="text-[#A9B2B1] mt-2 leading-relaxed font-sans text-xs">
                  Standard Ethereum uses sequential nonces (0, 1, 2). If tx #0 is pending, tx #1 is frozen.
                  Our SDK maps each leaf to an independent <strong>EIP-8250 nonce domain</strong> (<code className="font-mono">nonceKey = leafIndex</code>), unlocking true parallel execution!
                </p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-900 border border-blue-200 text-[11px]">
                Predeploy: 0x...8250 NonceManager
              </div>
            </div>

            {/* Card 3: Safe Replace-By-Fee */}
            <div className="p-5 bg-white swiss-border flex flex-col justify-between space-y-3">
              <div>
                <div className="w-8 h-8 bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-3 border border-rose-300">
                  <Flame className="w-4 h-4 text-rose-700" />
                </div>
                <h3 className="font-bold text-sm text-[#1A1A1A] font-swiss-display">
                  3. Key-Burning Bump
                </h3>
                <p className="text-[#A9B2B1] mt-2 leading-relaxed font-sans text-xs">
                  When speeding up a transaction, standard wallets re-sign under the same nonce. For OTS, that is fatal!
                  The SDK permanently marks the old leaf as <strong>BURNED</strong> in a local write-ahead journal and allocates a fresh leaf.
                </p>
              </div>
              <div className="p-2 bg-rose-50 text-rose-900 border border-rose-200 text-[11px]">
                Safety: Old key permanently destroyed
              </div>
            </div>

            {/* Card 4: Crash Recovery */}
            <div className="p-5 bg-white swiss-border flex flex-col justify-between space-y-3">
              <div>
                <div className="w-8 h-8 bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-3 border border-emerald-300">
                  <RotateCcw className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="font-bold text-sm text-[#1A1A1A] font-swiss-display">
                  4. Zero-State Recovery
                </h3>
                <p className="text-[#A9B2B1] mt-2 leading-relaxed font-sans text-xs">
                  Restoring a wallet from seed words on a new phone forgets unmined mempool transactions.
                  The SDK scans on-chain storage on devnet and applies a <strong>+16 Safety Gap</strong> past the highest mined leaf.
                </p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px]">
                Safety Gap: +16 uncollided leaves
              </div>
            </div>

            {/* Card 5: Arkiv DB-Chain Ephemeral Journal */}
            <div className="p-5 bg-white swiss-border flex flex-col justify-between space-y-3">
              <div>
                <div className="w-8 h-8 bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-3 border border-purple-300">
                  <Database className="w-4 h-4 text-purple-700" />
                </div>
                <h3 className="font-bold text-sm text-[#1A1A1A] font-swiss-display">
                  5. Arkiv DB-Chain Journal
                </h3>
                <p className="text-[#A9B2B1] mt-2 leading-relaxed font-sans text-xs">
                  Coordinates unspent leaves across multiple devices using <strong>Arkiv DB-Chain</strong>.
                  Entities carry a <strong>10-minute native TTL</strong>: if a mempool tx drops unmined, Arkiv automatically prunes it without centralized servers!
                </p>
              </div>
              <div className="p-2 bg-purple-50 text-purple-900 border border-purple-200 text-[11px]">
                TTL: 10m Auto-Pruning on Rabdi
              </div>
            </div>
          </div>
        </section>

        {/* 2. THE INTERACTIVE STUDIO PLAYGROUND */}
        <div className="border-t border-[#1A1A1A]">
          <LeafManagerStudio userWallet={walletAddress} />
        </div>

        {/* 3. HOW DEVELOPERS IMPLEMENT THIS IN THEIR PROJECTS */}
        <section className="py-20 bg-[#F2F2F2] swiss-border-t swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-10">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#D82C2C]" />
                <span>INTEGRATION GUIDE FOR DEVELOPERS</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
                How to Implement LeafManager in Your dApp or Wallet
              </h2>
              <p className="text-sm sm:text-base text-[#1A1A1A]/70 max-w-2xl mt-1 leading-relaxed">
                Add post-quantum safety and EIP-8250 parallel transaction support to your application in 4 straightforward steps.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Step 1 & 2 */}
              <div className="space-y-6">
                {/* Step 1 Code */}
                <div className="bg-white swiss-border p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono font-bold text-[#D82C2C] uppercase">
                      STEP 1: INSTALL &amp; INITIALIZE
                    </span>
                    <button
                      onClick={() => copyCode(snippetInit, "init")}
                      className="inline-flex items-center gap-1 text-[11px] font-swiss-mono text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors"
                    >
                      {copiedSnippet === "init" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === "init" ? "COPIED" : "COPY CODE"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed swiss-border">
                    <code>{snippetInit}</code>
                  </pre>
                  <p className="text-xs text-[#1A1A1A]/70 font-sans leading-relaxed">
                    Instantiate the client pointing to the Hegot&aacute; Ethrex devnet RPC. The SDK automatically resolves the EIP-8250 <code className="font-mono text-[#1A1A1A]">NONCE_MANAGER</code> predeploy at <code className="font-mono text-[#1A1A1A]">0x...8250</code>.
                  </p>
                </div>

                {/* Step 2 Code */}
                <div className="bg-white swiss-border p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono font-bold text-[#D82C2C] uppercase">
                      STEP 2: ALLOCATE PARALLEL LEAF CHANNELS
                    </span>
                    <button
                      onClick={() => copyCode(snippetAllocate, "allocate")}
                      className="inline-flex items-center gap-1 text-[11px] font-swiss-mono text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors"
                    >
                      {copiedSnippet === "allocate" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === "allocate" ? "COPIED" : "COPY CODE"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed swiss-border">
                    <code>{snippetAllocate}</code>
                  </pre>
                  <p className="text-xs text-[#1A1A1A]/70 font-sans leading-relaxed">
                    Instead of queuing sequentially, request multiple concurrent channels. The SDK immediately registers them as <code className="font-mono text-amber-700">RESERVED</code> in the write-ahead journal before signing to prevent accidental double-spending.
                  </p>
                </div>
              </div>

              {/* Step 3 & 4 */}
              <div className="space-y-6">
                {/* Step 3 Code */}
                <div className="bg-white swiss-border p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono font-bold text-[#D82C2C] uppercase">
                      STEP 3: EXECUTE SAFE FEE-BUMP (RBF)
                    </span>
                    <button
                      onClick={() => copyCode(snippetBump, "bump")}
                      className="inline-flex items-center gap-1 text-[11px] font-swiss-mono text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors"
                    >
                      {copiedSnippet === "bump" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === "bump" ? "COPIED" : "COPY CODE"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed swiss-border">
                    <code>{snippetBump}</code>
                  </pre>
                  <p className="text-xs text-[#1A1A1A]/70 font-sans leading-relaxed">
                    When gas spikes require speeding up an unmined transaction, <code className="font-mono text-red-600">bumpFee()</code> permanently marks the old leaf as <code className="font-mono text-red-600">BURNED</code>, generates a replacement channel, and prevents fatal OTS key leakage.
                  </p>
                </div>

                {/* Step 4 Code */}
                <div className="bg-white swiss-border p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono font-bold text-[#D82C2C] uppercase">
                      STEP 4: ROUTE VIA ERC-8421 ALT-MEMPOOL
                    </span>
                    <button
                      onClick={() => copyCode(snippetRouter, "router")}
                      className="inline-flex items-center gap-1 text-[11px] font-swiss-mono text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors"
                    >
                      {copiedSnippet === "router" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === "router" ? "COPIED" : "COPY CODE"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#1A1A1A] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed swiss-border">
                    <code>{snippetRouter}</code>
                  </pre>
                  <p className="text-xs text-[#1A1A1A]/70 font-sans leading-relaxed">
                    Evaluates transaction verification gas requirements against the 100k canonical mempool ceiling. Automatically routes heavy post-quantum transactions (&gt;100k gas) to the ERC-8421 sidecar with staked collateral.
                  </p>
                </div>

                {/* Step 5 Code: Arkiv DB-Chain */}
                <div className="bg-white swiss-border p-6 shadow-sm space-y-3 border-purple-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-swiss-mono font-bold text-purple-900 uppercase flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-purple-600" />
                      <span>STEP 5: SYNC JOURNAL ON ARKIV DB-CHAIN</span>
                    </span>
                    <button
                      onClick={() => copyCode(snippetArkiv, "arkiv")}
                      className="inline-flex items-center gap-1 text-[11px] font-swiss-mono text-[#A9B2B1] hover:text-[#1A1A1A] transition-colors"
                    >
                      {copiedSnippet === "arkiv" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet === "arkiv" ? "COPIED" : "COPY CODE"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-[#1A1A1A] text-purple-300 font-mono text-xs overflow-x-auto leading-relaxed swiss-border">
                    <code>{snippetArkiv}</code>
                  </pre>
                  <p className="text-xs text-[#1A1A1A]/70 font-sans leading-relaxed">
                    Publishes ephemeral leaf reservations to the <strong>Arkiv Rabdi DB-Chain</strong> (<code className="font-mono">qframe.leaf-journal</code>) with a 10-minute native TTL. If an alt-mempool transaction is dropped unmined, Arkiv automatically prunes the record, releasing the leaf without requiring a centralized server.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

