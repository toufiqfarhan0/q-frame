"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#1A1A1A] py-12 px-6">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs font-swiss-mono">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 bg-[#D82C2C]" />
            <span className="font-bold text-sm tracking-tight font-swiss-display">Q-FRAME</span>
          </div>
          <p className="text-[#A9B2B1] leading-relaxed">
            Post-Quantum Frame Transactions &amp; Staked Alternative Mempools.
          </p>
          <div className="mt-4 text-[#A9B2B1]">
            &copy; 2026 Q-Frame Protocol. MIT License.
          </div>
        </div>

        <div>
          <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">DEVNET ENDPOINTS</div>
          <ul className="space-y-2 text-[#A9B2B1]">
            <li>Hegot&aacute; RPC: <code className="text-[#1A1A1A]">rpc1.hegota.ethrex.xyz</code></li>
            <li>Chain ID: <code className="text-[#1A1A1A]">3151908 &amp; 1337</code></li>
            <li>Explorer: <code className="text-[#1A1A1A]">dora.hegota.ethrex.xyz</code></li>
            <li>Sidecar: <code className="text-[#1A1A1A]">altmempoolgateway</code></li>
          </ul>
        </div>

        <div>
          <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">PROTOCOL SUITE</div>
          <ul className="space-y-2 text-[#A9B2B1]">
            <li>
              <Link href="/simulator" className="hover:text-[#D82C2C] transition-colors">
                Gas Curve Simulator &rarr;
              </Link>
            </li>
            <li>
              <Link href="/studio" className="hover:text-[#D82C2C] transition-colors">
                LeafManager SDK Studio &rarr;
              </Link>
            </li>
            <li>
              <a
                href="https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#D82C2C] transition-colors"
              >
                PQBenchmarkAccount.sol
              </a>
            </li>
            <li>
              <a
                href="https://dora.hegota.ethrex.xyz/tx/0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#D82C2C] transition-colors"
              >
                Deployment Block #1317596
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">STANDARDS &amp; EIPS</div>
          <ul className="space-y-2 text-[#A9B2B1]">
            <li className="text-[#1A1A1A] font-semibold">EIP-8141 (Frame Transactions)</li>
            <li>ERC-8421 (Alt-Mempools)</li>
            <li>EIP-8250 (Keyed Nonces)</li>
            <li>NIST FIPS 205 (SLH-DSA)</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

