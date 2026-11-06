"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "../context/WalletContext";
import { Wallet, Check, AlertCircle, X, ArrowUpRight, RefreshCw } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const {
    walletAddress,
    isConnecting,
    connectingWalletName,
    isWalletModalOpen,
    setIsWalletModalOpen,
    connectWallet,
    connectSpecificWallet,
    connectWithProvider,
    cancelConnecting,
    disconnectWallet,
    chainId,
    switchToDevnet,
    walletError,
    isStaked,
    isCheckingStake,
    discoveredWallets,
    getPhantomProvider,
    getMetaMaskProvider,
    getCoinbaseProvider,
    getRabbyProvider,
  } = useWallet();

  const [isCopied, setIsCopied] = useState(false);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDevnet = chainId === "0x301824" || chainId === "0x539" || chainId === "1337" || chainId === "3151908";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md swiss-border-b">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 whitespace-nowrap">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer flex-shrink-0 whitespace-nowrap">
              <span className="w-3.5 h-3.5 bg-[#D82C2C] inline-block transition-transform duration-200 group-hover:scale-110 flex-shrink-0" />
              <span className="font-bold tracking-tighter text-lg font-swiss-display text-[#1A1A1A] whitespace-nowrap">
                Q‑FRAME
              </span>
            </Link>
          </div>

          {/* Right Section: Nav Links + Wallet Actions */}
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 whitespace-nowrap">
            {/* Navigation Links */}
            <nav className="flex items-center gap-4 sm:gap-6 text-xs xl:text-sm font-medium flex-shrink-0 whitespace-nowrap">
              <Link
                href="/simulator"
                className={`transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 font-bold ${
                  pathname === "/simulator"
                    ? "text-[#D82C2C] border-b-2 border-[#D82C2C] pb-0.5"
                    : "text-[#1A1A1A] hover:text-[#D82C2C]"
                }`}
              >
                Gas Simulator
              </Link>
              <Link
                href="/studio"
                className={`transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 font-bold ${
                  pathname === "/studio"
                    ? "text-[#D82C2C] border-b-2 border-[#D82C2C] pb-0.5"
                    : "text-[#D82C2C] hover:text-black"
                }`}
              >
                SDK Studio
              </Link>
            </nav>

            <div className="h-4 w-px bg-[#1A1A1A]/20 hidden sm:block" />

            {/* Wallet Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 whitespace-nowrap">
            {walletAddress ? (
              <div className="flex items-center gap-2">
                {!isDevnet && (
                  <button
                    onClick={switchToDevnet}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 text-white font-mono text-[11px] font-bold hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>SWITCH TO HEGOTÁ</span>
                  </button>
                )}
                <div className="relative group">
                  <button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#F2F2F2] border border-[#1A1A1A] text-xs font-mono font-bold hover:bg-[#E2E6E6] transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                    {isCheckingStake ? (
                      <span className="text-[10px] text-[#A9B2B1]">...</span>
                    ) : isStaked ? (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px]">STAKED</span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px]">UNSTAKED</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="btn-swiss-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer flex-shrink-0 whitespace-nowrap"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>CONNECT WALLET</span>
              </button>
            )}

            <Link
              href="/simulator"
              className="btn-swiss-primary py-1.5 px-3 text-xs flex-shrink-0 whitespace-nowrap flex items-center gap-1"
            >
              <span>Simulate</span>
            </Link>
          </div>
        </div>
      </div>
    </header>

      {/* Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setIsWalletModalOpen(false)}
              className="absolute top-4 right-4 text-[#A9B2B1] hover:text-[#1A1A1A] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-[#D82C2C]" />
              <h3 className="font-bold text-lg font-swiss-display text-[#1A1A1A]">
                {walletAddress ? "Connected Devnet Wallet" : "Connect Devnet Wallet"}
              </h3>
            </div>

            {walletError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                {walletError}
              </div>
            )}

            {walletAddress ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#F2F2F2] border border-[#E2E6E6] font-mono text-xs space-y-1">
                  <div className="text-[10px] text-[#A9B2B1] uppercase font-bold">Address</div>
                  <div className="font-bold break-all text-[#1A1A1A]">{walletAddress}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#F2F2F2] border border-[#E2E6E6]">
                    <div className="text-[10px] text-[#A9B2B1] uppercase font-bold">Chain ID</div>
                    <div className="font-bold text-[#1A1A1A]">
                      {chainId ? (
                        isDevnet ? (
                          <span className="text-emerald-700">{parseInt(chainId, 16)} (Hegotá ✓)</span>
                        ) : (
                          <span className="text-amber-700">{parseInt(chainId, 16)} (Switch to Hegotá ⚠️)</span>
                        )
                      ) : (
                        "Detecting..."
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#F2F2F2] border border-[#E2E6E6]">
                    <div className="text-[10px] text-[#A9B2B1] uppercase font-bold">ERC-8421 Stake</div>
                    <div className="font-bold">
                      {isCheckingStake ? (
                        <span className="text-[#A9B2B1]">Checking...</span>
                      ) : isStaked ? (
                        <span className="text-emerald-700 font-bold">ACTIVE (&ge;0.01 ETH)</span>
                      ) : (
                        <span className="text-amber-700 font-bold">UNSTAKED</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyAddress}
                    className="flex-1 py-2 bg-white border border-[#1A1A1A] text-xs font-mono font-bold hover:bg-[#F2F2F2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                    <span>{isCopied ? "COPIED" : "COPY ADDRESS"}</span>
                  </button>
                  <button
                    onClick={switchToDevnet}
                    className="flex-1 py-2 bg-[#D82C2C] text-white text-xs font-mono font-bold hover:bg-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>SWITCH TO HEGOTÁ</span>
                  </button>
                </div>

                <button
                  onClick={disconnectWallet}
                  className="w-full py-2 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  DISCONNECT
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#1A1A1A]/70 leading-relaxed font-sans">
                  Select your preferred Web3 wallet to connect to the Hegot&aacute; Frame Devnet:
                </p>

                {/* Connecting State */}
                {isConnecting && connectingWalletName && (
                  <div className="p-3 bg-amber-50 border border-amber-300 text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Requesting signature from {connectingWalletName}...</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-tight">
                      Please check your extension popup to approve the connection.
                    </p>
                    <button
                      onClick={cancelConnecting}
                      className="text-xs text-[#D82C2C] underline font-bold cursor-pointer hover:text-[#b02222]"
                    >
                      Cancel request
                    </button>
                  </div>
                )}

                {/* Multi-Wallet Choices */}
                <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {/* 1. MetaMask */}
                  <button
                    onClick={() => connectSpecificWallet("metamask")}
                    disabled={isConnecting}
                    className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#E2761B] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-mono">
                        MM
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                          <span>MetaMask</span>
                          {typeof window !== "undefined" && getMetaMaskProvider() && (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              DETECTED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A9B2B1]">Browser Extension / Mobile</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                  </button>

                  {/* 2. Phantom */}
                  <button
                    onClick={() => connectSpecificWallet("phantom")}
                    disabled={isConnecting}
                    className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#AB9FF2] flex items-center justify-center text-[#1A1A1A] font-bold text-xs flex-shrink-0 font-mono">
                        PH
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                          <span>Phantom</span>
                          {typeof window !== "undefined" && getPhantomProvider() && (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              DETECTED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A9B2B1]">Solana &amp; Ethereum EVM Extension</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                  </button>

                  {/* 3. Coinbase Wallet */}
                  <button
                    onClick={() => connectSpecificWallet("coinbase")}
                    disabled={isConnecting}
                    className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0052FF] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-mono">
                        CB
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                          <span>Coinbase Wallet</span>
                          {typeof window !== "undefined" && getCoinbaseProvider() && (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              DETECTED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A9B2B1]">Browser Extension / Smart Wallet</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                  </button>

                  {/* 4. Rabby Wallet */}
                  <button
                    onClick={() => connectSpecificWallet("rabby")}
                    disabled={isConnecting}
                    className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#8697FF] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-mono">
                        RB
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                          <span>Rabby Wallet</span>
                          {typeof window !== "undefined" && getRabbyProvider() && (
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              DETECTED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A9B2B1]">DeFi Specialist Web3 Wallet</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                  </button>

                  {/* 5. Dynamically Discovered EIP-6963 Wallets (Rainbow, Zerion, Trust, OKX, etc.) */}
                  {discoveredWallets
                    .filter(
                      (w) =>
                        !["metamask", "phantom", "coinbase", "rabby"].some((n) =>
                          w.info.name.toLowerCase().includes(n)
                        )
                    )
                    .map((wallet) => (
                      <button
                        key={wallet.info.uuid}
                        onClick={() => connectWithProvider(wallet.provider, wallet.info.name)}
                        disabled={isConnecting}
                        className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                      >
                        <div className="flex items-center gap-3">
                          {wallet.info.icon ? (
                            <img
                              src={wallet.info.icon}
                              alt={wallet.info.name}
                              className="w-8 h-8 object-contain flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono">
                              W3
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                              <span>{wallet.info.name}</span>
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                DETECTED
                              </span>
                            </div>
                            <div className="text-[10px] text-[#A9B2B1]">EIP-6963 Discovered Provider</div>
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                      </button>
                    ))}

                  {/* 6. Default Injected Provider */}
                  <button
                    onClick={() => connectSpecificWallet("injected")}
                    disabled={isConnecting}
                    className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs font-mono text-[#1A1A1A] group-hover:text-[#D82C2C]">
                          Browser Injected Wallet
                        </div>
                        <div className="text-[10px] text-[#A9B2B1]">Default window.ethereum Provider</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

