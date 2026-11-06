"use client";

import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GasSimulator from "../components/GasSimulator";
import { Cpu, ShieldCheck, Flame, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMounted } from "../hooks/useMounted";

export default function SimulatorPage() {
  const isMounted = useMounted();

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
                  <span>SECTION 03 / MATHEMATICAL WORKLOAD BENCHMARK</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
                  Post-Quantum Gas Simulator
                </h1>
                <p className="text-sm md:text-base text-[#1A1A1A]/75 max-w-2xl mt-2 leading-relaxed">
                  Calibrate cryptographic hash-chain parameters against native EIP-8141 execution frames.
                  Simulates the 100,000 gas canonical mempool ceiling versus the extended 2,000,000 gas ERC-8421 staked allowance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-swiss-mono px-3 py-1.5 bg-white border border-[#1A1A1A] text-[#1A1A1A] font-bold">
                  TARGET: NIST FIPS 205 (SLH-DSA)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Simulator Section */}
        <section className="py-16 max-w-[1280px] mx-auto px-6">
          <GasSimulator />
        </section>

        {/* Theoretical Framework & Comparison Table */}
        <section className="py-16 bg-[#F2F2F2] swiss-border-t swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-8">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                CRYPTOGRAPHIC COST REFERENCE
              </div>
              <h2 className="text-2xl font-bold font-swiss-display text-[#1A1A1A] mt-1">
                Post-Quantum Cryptographic Schemes vs. Ethereum Mempool Ceilings
              </h2>
            </div>

            <div className="overflow-x-auto swiss-border bg-white">
              <table className="w-full text-left text-xs font-swiss-mono">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white uppercase text-[11px] border-b border-[#1A1A1A]">
                    <th className="p-3.5">Signature Scheme</th>
                    <th className="p-3.5">Standard / Primitive</th>
                    <th className="p-3.5">Verification Gas</th>
                    <th className="p-3.5">Canonical Mempool (100k)</th>
                    <th className="p-3.5">ERC-8421 Staked Mempool (2M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6E6]">
                  <tr>
                    <td className="p-3.5 font-bold text-[#1A1A1A]">ECDSA (secp256k1)</td>
                    <td className="p-3.5 text-[#A9B2B1]">Current Ethereum Standard</td>
                    <td className="p-3.5 font-bold">~3,000 Gas</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="p-3.5 font-bold text-[#1A1A1A]">Toy OTS (5 chains, 10 iter)</td>
                    <td className="p-3.5 text-[#A9B2B1]">Sub-standard hash tree</td>
                    <td className="p-3.5 font-bold text-amber-700">74,247 Gas</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted</td>
                  </tr>
                  <tr className="bg-red-50/70">
                    <td className="p-3.5 font-bold text-[#D82C2C]">NIST FIPS 205 (SLH-DSA)</td>
                    <td className="p-3.5 text-[#A9B2B1]">SPHINCS+ Stateless Hash-Tree</td>
                    <td className="p-3.5 font-bold text-[#D82C2C]">259,247 Gas</td>
                    <td className="p-3.5 text-red-700 font-bold">✕ REJECTED (DoS Wall)</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted (Staked Pass)</td>
                  </tr>
                  <tr className="bg-red-50/70">
                    <td className="p-3.5 font-bold text-[#D82C2C]">NIST FIPS 204 (ML-DSA)</td>
                    <td className="p-3.5 text-[#A9B2B1]">Lattice-Based Dilithium</td>
                    <td className="p-3.5 font-bold text-[#D82C2C]">~1,450,000 Gas</td>
                    <td className="p-3.5 text-red-700 font-bold">✕ REJECTED (DoS Wall)</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted (Staked Pass)</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-[#1A1A1A]">Winternitz OTS (Max Tree)</td>
                    <td className="p-3.5 text-[#A9B2B1]">35 chains &times; 25 iterations</td>
                    <td className="p-3.5 font-bold text-[#1A1A1A]">684,747 Gas</td>
                    <td className="p-3.5 text-red-700 font-bold">✕ REJECTED (DoS Wall)</td>
                    <td className="p-3.5 text-emerald-700 font-bold">✓ Admitted (Staked Pass)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 p-6 bg-white swiss-border text-xs leading-relaxed font-sans space-y-3">
              <h3 className="font-bold text-sm font-swiss-display text-[#1A1A1A]">
                Why Does the Canonical Mempool Enforce a 100,000 Gas Wall?
              </h3>
              <p className="text-[#1A1A1A]/80">
                In standard Ethereum, validation execution (the code executed before the transaction is sealed into a block) is performed by every node for free. If an attacker submits a transaction that takes 1,000,000 gas to verify and then reverts or fails to pay, the network spends massive compute without compensation — a classic Denial-of-Service (DoS) vector.
              </p>
              <p className="text-[#1A1A1A]/80">
                <strong>ERC-8421 solves this through economic stake bonding:</strong> By requiring the transaction sender to bond at least 0.01 ETH in <code className="bg-[#F2F2F2] px-1 py-0.5 font-mono">NaiveStakingRegistry</code>, the alternative mempool sidecar safely permits up to 2,000,000 gas because malicious or uncompensated transactions result in collateral slashing and peer reputation bans.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

