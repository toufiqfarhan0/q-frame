"use client";

import React, { useState, useEffect } from "react";
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
  LogOut,
  AlertCircle,
  RefreshCw,
  X,
  Radio,
  Info,
  HelpCircle,
  Zap,
} from "lucide-react";

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export default function Home() {
  // Web3 Wallet Connection State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectingWalletName, setConnectingWalletName] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [discoveredWallets, setDiscoveredWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [isStakingTx, setIsStakingTx] = useState<boolean>(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [isDemoAccount, setIsDemoAccount] = useState<boolean>(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState<boolean>(false);
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null);

  // Simulator State
  const [chains, setChains] = useState<number>(15);
  const [iterations, setIterations] = useState<number>(20);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helpers to resolve specific wallet providers (Phantom, MetaMask, Coinbase, Rabby, Injected)
  const getPhantomProvider = () => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.phantom?.ethereum) return w.phantom.ethereum;
    if (w.ethereum?.providers?.length) {
      const p = w.ethereum.providers.find((prov: any) => prov.isPhantom);
      if (p) return p;
    }
    if (w.ethereum?.isPhantom) return w.ethereum;
    return null;
  };

  const getMetaMaskProvider = () => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.ethereum?.providers?.length) {
      const mm = w.ethereum.providers.find(
        (p: any) => p.isMetaMask && !p.isPhantom && !p.isCoinbaseWallet
      );
      if (mm) return mm;
    }
    if (w.ethereum?.isMetaMask && !w.ethereum?.isPhantom && !w.ethereum?.isCoinbaseWallet) {
      return w.ethereum;
    }
    return null;
  };

  const getCoinbaseProvider = () => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.coinbaseWalletExtension) return w.coinbaseWalletExtension;
    if (w.ethereum?.providers?.length) {
      const cb = w.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
      if (cb) return cb;
    }
    if (w.ethereum?.isCoinbaseWallet) return w.ethereum;
    return null;
  };

  const getRabbyProvider = () => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.rabby) return w.rabby;
    if (w.ethereum?.providers?.length) {
      const r = w.ethereum.providers.find((p: any) => p.isRabby);
      if (r) return r;
    }
    if (w.ethereum?.isRabby) return w.ethereum;
    return null;
  };

  const getAnyEthereumProvider = () => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return (
      getPhantomProvider() ||
      getMetaMaskProvider() ||
      getCoinbaseProvider() ||
      getRabbyProvider() ||
      w.ethereum ||
      null
    );
  };

  // Modern EIP-6963 Dynamic Wallet Discovery (Announce & Request Providers)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAnnounce = (event: any) => {
      if (!event.detail || !event.detail.info) return;
      setDiscoveredWallets((prev) => {
        if (
          prev.some(
            (w) =>
              w.info.uuid === event.detail.info.uuid ||
              w.info.name.toLowerCase() === event.detail.info.name.toLowerCase()
          )
        ) {
          return prev;
        }
        return [...prev, event.detail];
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  // Check if wallet is already connected on mount (respecting explicit user disconnect)
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("qframe_disconnected") === "true") {
      return;
    }
    const eth = getAnyEthereumProvider();
    if (eth) {
      eth
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (typeof window !== "undefined" && localStorage.getItem("qframe_disconnected") === "true") {
            return;
          }
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setActiveProvider(eth);
            setIsDemoAccount(false);
            eth
              .request({ method: "eth_chainId" })
              .then((cid: string) => setChainId(cid))
              .catch(() => {});
            eth
              .request({ method: "eth_getBalance", params: [accounts[0], "latest"] })
              .then((bal: string) => {
                const ethVal = (Number(BigInt(bal)) / 1e18).toFixed(4);
                setWalletBalance(ethVal);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  const connectWithProvider = async (provider: any, label: string) => {
    if (!provider) {
      setWalletError(
        `No ${label} extension detected in this browser. Please install ${label} or choose another option below.`
      );
      return;
    }

    try {
      setIsConnecting(true);
      setConnectingWalletName(label);
      setWalletError(null);

      // 15-second timeout so it never hangs indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Approval pending in ${label}: please click the ${label} icon in your browser toolbar to approve the connection.`
              )
            ),
          15000
        )
      );

      const requestPromise = provider.request({ method: "eth_requestAccounts" });
      const accounts = (await Promise.race([requestPromise, timeoutPromise])) as string[];

      if (accounts && accounts.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("qframe_disconnected");
        }
        const address = accounts[0];
        setWalletAddress(address);
        setActiveProvider(provider);
        setIsDemoAccount(false);
        setIsWalletModalOpen(false);

        try {
          const currentChainId = await provider.request({ method: "eth_chainId" });
          setChainId(currentChainId);
        } catch {}

        try {
          const balanceHex = await provider.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });
          const balanceWei = BigInt(balanceHex);
          const ethVal = (Number(balanceWei) / 1e18).toFixed(4);
          setWalletBalance(ethVal);
        } catch {
          setWalletBalance("0.0000");
        }

        // Attach listeners for live network and account changes
        if (provider.on) {
          provider.on("accountsChanged", (newAccs: string[]) => {
            if (typeof window !== "undefined" && localStorage.getItem("qframe_disconnected") === "true") {
              return;
            }
            if (!newAccs || newAccs.length === 0) {
              disconnectWallet();
            } else {
              setWalletAddress(newAccs[0]);
            }
          });
          provider.on("chainChanged", (newCid: string) => {
            setChainId(newCid);
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setWalletError(
        err.message ||
          `Connection prompt pending. Please click the ${label} icon in your browser's toolbar to approve.`
      );
    } finally {
      setIsConnecting(false);
      setConnectingWalletName(null);
    }
  };

  const connectSpecificWallet = async (
    type: "metamask" | "phantom" | "coinbase" | "rabby" | "injected" | "demo"
  ) => {
    if (type === "demo") {
      connectDemoAccount();
      setIsWalletModalOpen(false);
      return;
    }
    if (type === "metamask") {
      const p = getMetaMaskProvider() || getAnyEthereumProvider();
      await connectWithProvider(p, "MetaMask");
    } else if (type === "phantom") {
      const p = getPhantomProvider();
      await connectWithProvider(p, "Phantom");
    } else if (type === "coinbase") {
      const p = getCoinbaseProvider() || getAnyEthereumProvider();
      await connectWithProvider(p, "Coinbase Wallet");
    } else if (type === "rabby") {
      const p = getRabbyProvider();
      await connectWithProvider(p, "Rabby Wallet");
    } else {
      const p = getAnyEthereumProvider();
      await connectWithProvider(p, "Browser Wallet");
    }
  };

  const cancelConnecting = () => {
    setIsConnecting(false);
    setConnectingWalletName(null);
    setWalletError(null);
  };

  const connectWallet = () => {
    setIsWalletModalOpen(true);
    setWalletError(null);
  };

  const connectDemoAccount = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("qframe_disconnected");
    }
    setWalletAddress("0x08cfae005698Fae83cA442FfEFb69c58904cFf9c");
    setWalletBalance("1.0000");
    setChainId("0x301824");
    setActiveProvider(null);
    setIsDemoAccount(true);
    setWalletError(null);
    setIsWalletModalOpen(false);
  };

  const disconnectWallet = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("qframe_disconnected", "true");
    }
    const eth = activeProvider || getAnyEthereumProvider();
    if (eth && eth.request) {
      try {
        await eth.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {}
    }
    setWalletAddress(null);
    setWalletBalance(null);
    setChainId(null);
    setActiveProvider(null);
    setTxSuccessHash(null);
    setIsDemoAccount(false);
    setWalletError(null);
  };

  const switchToHegota = async () => {
    const eth = activeProvider || getAnyEthereumProvider();
    if (!eth) return;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x301824" }], // 3151908 in hex
      });
      setChainId("0x301824");
    } catch (switchError: any) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x301824",
              chainName: "Hegotá Frame Devnet",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc1.hegota.ethrex.xyz"],
              blockExplorerUrls: ["https://dora.hegota.ethrex.xyz"],
            },
          ],
        });
        setChainId("0x301824");
      } catch (addError) {
        console.error(addError);
      }
    }
  };

  const claimFaucet = async (targetAddr?: string) => {
    const addr = targetAddr || walletAddress;
    if (!addr) {
      setWalletError("Connect wallet or click Demo Account first.");
      return;
    }
    try {
      setIsClaimingFaucet(true);
      setFaucetStatus(null);
      const res = await fetch("https://faucet.hegota.ethrex.xyz/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (res.ok) {
        setFaucetStatus(`1.0 ETH sent! Tx: ${data.txhash || "Success"}`);
      } else {
        setFaucetStatus(data.msg || "Faucet rate-limited (1 claim/hr/IP). Use pre-funded Demo Account.");
      }
    } catch (e: any) {
      setFaucetStatus("Faucet claim request sent. If rate-limited, use the pre-funded Demo Account.");
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const handleSimulateStake = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    if (isDemoAccount) {
      setIsStakingTx(true);
      setTimeout(() => {
        setTxSuccessHash("0xfaae1e16367f7bacb9c8a836cc8cfda3d920a0eb6482549b736d50f51880555c");
        setIsStakingTx(false);
      }, 1000);
      return;
    }
    const eth = activeProvider || getAnyEthereumProvider();
    if (!eth) return;
    try {
      setIsStakingTx(true);
      setTxSuccessHash(null);
      setWalletError(null);
      // Calls execute(address,uint256,bytes) on PQBenchmarkAccount
      const executeCalldata = "0x1cff79cd0000000000000000000000008943545177806ed17b9f23f0a21ee5948ecaa776000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000";
      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: "0xe5c5A34833db3A90E30adCD98f2955E36496483B", // PQBenchmarkAccount
            data: executeCalldata,
            value: "0x0",
          },
        ],
      });
      setTxSuccessHash(txHash);
    } catch (err: any) {
      console.error(err);
      setWalletError(err.message || "Transaction cancelled or failed");
    } finally {
      setIsStakingTx(false);
    }
  };

  // Gas model calibrated from Foundry GasCurveTest.t.sol
  // Base cost ~37,247 gas + chain overhead
  const calculatedGas = Math.round(37247 + chains * iterations * 740);
  const canonicalCap = 100000;
  const altMempoolCap = 1000000;
  const isCanonicalRejected = calculatedGas > canonicalCap;
  const isAltMempoolAdmitted = calculatedGas <= altMempoolCap;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] flex flex-col font-sans selection:bg-[#D82C2C] selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER / NAVIGATION (SWISS STRUCTURED - STRICT SINGLE LINE)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md swiss-border-b">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 whitespace-nowrap">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <a href="#" className="flex items-center gap-2 group cursor-pointer flex-shrink-0 whitespace-nowrap">
              <span className="w-3.5 h-3.5 bg-[#D82C2C] inline-block transition-transform duration-200 group-hover:scale-110 flex-shrink-0" />
              <span className="font-bold tracking-tighter text-lg font-swiss-display text-[#1A1A1A] whitespace-nowrap">
                Q&#8209;FRAME
              </span>
            </a>
          </div>

          {/* Navigation Links - Single Line Guaranteed */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-xs xl:text-sm font-medium flex-shrink-0 whitespace-nowrap">
            <a
              href="#architecture"
              className="text-[#1A1A1A] hover:text-[#D82C2C] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Architecture
            </a>
            <a
              href="#evidence"
              className="text-[#1A1A1A] hover:text-[#D82C2C] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              On&#8209;Chain Proof
            </a>
            <a
              href="#simulator"
              className="text-[#1A1A1A] hover:text-[#D82C2C] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Gas Simulator
            </a>
            <a
              href="#benchmarks"
              className="text-[#1A1A1A] hover:text-[#D82C2C] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Benchmarks
            </a>
            <a
              href="#pricing"
              className="text-[#1A1A1A] hover:text-[#D82C2C] transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Mempool Tiers
            </a>
          </nav>

          {/* Action Buttons - Single Line Guaranteed */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 whitespace-nowrap">
            {/* Connect Wallet Button / Connected Pill */}
            {walletAddress ? (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[#F2F2F2] border border-[#1A1A1A] text-xs font-swiss-mono flex-shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse flex-shrink-0" />
                <span className="font-bold text-[#1A1A1A]">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                {walletBalance && (
                  <span className="text-[#A9B2B1] hidden md:inline">
                    ({walletBalance} ETH)
                  </span>
                )}
                {chainId !== "0x301824" && (
                  <button
                    onClick={switchToHegota}
                    title="Switch wallet network to Hegotá Frame Devnet (3151908)"
                    className="ml-1 text-[10px] bg-[#D82C2C] text-white px-1.5 py-0.5 rounded-none font-bold hover:bg-[#b02222] transition-colors cursor-pointer"
                  >
                    Switch to Hegotá
                  </button>
                )}
                <button
                  onClick={disconnectWallet}
                  title="Disconnect wallet"
                  className="ml-1 text-[#A9B2B1] hover:text-[#D82C2C] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-swiss-mono border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer whitespace-nowrap flex-shrink-0 font-semibold"
              >
                <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
                <span>CONNECT WALLET</span>
              </button>
            )}

            <a
              href="#simulator"
              className="btn-swiss-primary px-3.5 sm:px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <span className="whitespace-nowrap">Simulate</span>
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          NETWORK STATUS BANNER (SEPOLIA / WRONG CHAIN DETECTOR)
      ───────────────────────────────────────────────────────────── */}
      {walletAddress && chainId && chainId !== "0x301824" && (
        <div className="bg-[#1A1A1A] text-white border-b-2 border-[#D82C2C] px-4 py-3 text-xs font-swiss-mono">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#D82C2C] flex-shrink-0 mt-0.5 md:mt-0" />
              <span>
                <strong className="text-white">
                  Active Network: {chainId === "0xaa36a7" ? "Ethereum Sepolia (Chain 11155111)" : `Chain ${chainId}`}
                </strong>{" "}
                — You have Sepolia ETH, but EIP&#8209;8141 Frame Transactions (Opcode <code className="text-[#D82C2C] font-bold">0xAA</code>) 
                only execute on the <strong>Hegotá Frame Devnet (Chain 3151908)</strong>. Sepolia does not have EIP-8141 opcodes!
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={switchToHegota}
                className="bg-[#D82C2C] hover:bg-[#b02222] text-white px-3 py-1 font-bold text-xs uppercase transition-colors cursor-pointer"
              >
                Switch to Hegotá (1-Click)
              </button>
              <button
                onClick={connectDemoAccount}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-xs uppercase transition-colors cursor-pointer border border-white/20"
              >
                Use Demo Account (1.0 ETH)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONNECT WALLET MODAL (SWISS MINIMALIST DIALOG)
      ───────────────────────────────────────────────────────────── */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-md shadow-2xl relative">
            {/* Top Swiss Accent Bar */}
            <div className="h-1.5 bg-[#D82C2C] w-full" />

            {/* Modal Header */}
            <div className="p-5 border-b border-[#1A1A1A] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-swiss-mono uppercase tracking-widest text-[#A9B2B1]">
                  Web3 Provider Selection
                </span>
                <h3 className="text-xl font-bold font-swiss-display text-[#1A1A1A] tracking-tight">
                  Connect Wallet
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsWalletModalOpen(false);
                  cancelConnecting();
                }}
                className="p-1 hover:bg-[#F2F2F2] border border-transparent hover:border-[#1A1A1A] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3">
              {/* Connection Status / Waiting Notice */}
              {isConnecting && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-swiss-mono space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D82C2C]" />
                    <span>Connecting to {connectingWalletName}...</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    If the popup did not appear, <strong>look for your wallet&apos;s icon in your browser&apos;s extension toolbar</strong> (top-right near the address bar) and click it to approve the connection.
                  </p>
                  <button
                    onClick={cancelConnecting}
                    className="text-xs text-[#D82C2C] underline font-bold cursor-pointer hover:text-[#b02222]"
                  >
                    Cancel request
                  </button>
                </div>
              )}

              {/* Error message */}
              {walletError && (
                <div className="p-3 bg-red-50 border border-red-300 text-[#D82C2C] text-xs font-swiss-mono leading-relaxed">
                  {walletError}
                </div>
              )}

              {/* Wallet Choices */}
              <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {/* 1. MetaMask */}
                <button
                  onClick={() => connectSpecificWallet("metamask")}
                  disabled={isConnecting}
                  className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-[#E2761B] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-swiss-mono">
                      MM
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                        <span>MetaMask</span>
                        {typeof window !== "undefined" && getMetaMaskProvider() && (
                          <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                            DETECTED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#A9B2B1]">Injected Web3 Provider</div>
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
                    <div className="w-8 h-8 rounded-none bg-[#AB9FF2] flex items-center justify-center text-[#1A1A1A] font-bold text-xs flex-shrink-0 font-swiss-mono">
                      PH
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
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
                    <div className="w-8 h-8 rounded-none bg-[#0052FF] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-swiss-mono">
                      CB
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
                        <span>Coinbase Wallet</span>
                        {typeof window !== "undefined" && getCoinbaseProvider() && (
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

                {/* 4. Rabby Wallet */}
                <button
                  onClick={() => connectSpecificWallet("rabby")}
                  disabled={isConnecting}
                  className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-[#8697FF] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 font-swiss-mono">
                      RB
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
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

                {/* 5. Dynamically Discovered EIP-6963 Wallets (e.g. OKX, Zerion, Trust, Rainbow, etc.) */}
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
                            className="w-8 h-8 object-contain rounded-none flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 font-swiss-mono">
                            W3
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C] flex items-center gap-2">
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

                {/* 6. Default Browser Injected Wallet */}
                <button
                  onClick={() => connectSpecificWallet("injected")}
                  disabled={isConnecting}
                  className="w-full p-3 border border-[#1A1A1A] hover:border-[#D82C2C] hover:bg-[#F2F2F2] flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] group-hover:text-[#D82C2C]">
                        Default Browser Wallet
                      </div>
                      <div className="text-[10px] text-[#A9B2B1]">Brave, Opera, or active window.ethereum</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#A9B2B1] group-hover:text-[#D82C2C]" />
                </button>

                {/* Divider */}
                <div className="relative py-1 flex items-center">
                  <div className="flex-grow border-t border-[#A9B2B1]/30"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-swiss-mono text-[#A9B2B1]">
                    Or 1-Click Zero Setup
                  </span>
                  <div className="flex-grow border-t border-[#A9B2B1]/30"></div>
                </div>

                {/* 7. Instant Demo Account */}
                <button
                  onClick={() => connectSpecificWallet("demo")}
                  className="w-full p-3 bg-[#F2F2F2] border-2 border-dashed border-[#D82C2C] hover:bg-red-50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#D82C2C] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 font-swiss-mono">
                      1.0
                    </div>
                    <div>
                      <div className="font-bold text-xs font-swiss-mono text-[#1A1A1A] flex items-center gap-1.5">
                        <span>Pre-Funded Demo Account</span>
                        <span className="bg-[#D82C2C] text-white text-[9px] px-1 py-0.5 font-bold uppercase">
                          Judges
                        </span>
                      </div>
                      <div className="text-[10px] text-[#1A1A1A]/70">
                        Zero extension needed · 1.0 ETH loaded on Hegotá Devnet
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#D82C2C]" />
                </button>
              </div>
            </div>

            {/* Modal Footer with Chain details */}
            <div className="p-4 bg-[#F2F2F2] border-t border-[#1A1A1A] text-[10px] font-swiss-mono text-[#1A1A1A]/70 flex items-center justify-between">
              <span>Devnet: Hegotá (ID 3151908)</span>
              <a
                href="https://faucet.hegota.ethrex.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D82C2C] hover:underline flex items-center gap-1"
              >
                <span>Devnet Faucet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* ─────────────────────────────────────────────────────────────
            2. HERO SECTION (ASYMMETRICAL 12-COL GRID)
        ───────────────────────────────────────────────────────────── */}
        <section className="relative swiss-border-b overflow-hidden bg-white">
          <div className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F2F2F2] border border-[#A9B2B1]/40 text-xs font-swiss-mono">
                <span className="text-[#D82C2C] font-bold">SPEC 01</span>
                <span className="text-[#A9B2B1]">/</span>
                <span>ETHGLOBAL MUMBAI 2026 · ETHEREUM FOUNDATION TRACK</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] leading-[1.05]">
                POST-QUANTUM <br />
                <span className="text-[#D82C2C]">FRAME TRANSACTIONS</span> <br />
                ON ALTERNATIVE MEMPOOLS.
              </h1>

              <p className="text-base sm:text-lg text-[#1A1A1A]/85 max-w-xl leading-relaxed">
                Standard Ethereum nodes reject post-quantum cryptography because NIST FIPS 205 (SPHINCS+) 
                verification demands over <strong>200,000 gas</strong>, hitting the hard 100k mempool validation wall. 
                <strong> Q-Frame</strong> leverages <strong>EIP-8141</strong> frame transactions and <strong>ERC-8421</strong> staked alternative 
                mempools to elevate validation capacity to <strong>1,000,000 gas</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#simulator"
                  className="btn-swiss-primary px-6 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 cursor-pointer"
                >
                  <span>Interactive Gas Simulator</span>
                  <Sliders className="w-4 h-4" />
                </a>
                <a
                  href="#evidence"
                  className="btn-swiss-secondary px-6 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 cursor-pointer"
                >
                  <span>Inspect Live Deployment</span>
                  <ExternalLink className="w-4 h-4" />
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
                  <div className="font-bold text-[#D82C2C] mt-1">1,000,000 GAS (+900%)</div>
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
                    <div className="text-white font-bold text-sm mt-1">1,000,000 GAS</div>
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
            3. LIVE ON-CHAIN DEPLOYMENT BLOCK (VERIFIED EVIDENCE)
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
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#A9B2B1]/40 text-xs font-swiss-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>BLOCK #1317596 · STATUS: 0x1 MINED</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contract Address Card */}
              <div className="bg-white p-5 swiss-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-swiss-mono text-[#A9B2B1] mb-2">
                  <span>PQBenchmarkAccount Contract</span>
                  <span className="px-2 py-0.5 bg-[#F2F2F2] text-[#1A1A1A] font-semibold">Solidity 0.8.24</span>
                </div>
                <div className="font-swiss-mono text-sm sm:text-base font-bold text-[#1A1A1A] break-all my-2">
                  0xe5c5A34833db3A90E30adCD98f2955E36496483B
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-swiss-mono">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "0xe5c5A34833db3A90E30adCD98f2955E36496483B",
                        "contract"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A1A1A] text-white hover:bg-[#D82C2C] transition-colors cursor-pointer"
                  >
                    {copiedKey === "contract" ? (
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer font-bold"
                  >
                    <span>View on Dora Explorer</span>
                    <ExternalLink className="w-3 h-3 text-[#D82C2C]" />
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
                    <span>View on Dora</span>
                    <ExternalLink className="w-3 h-3 text-[#D82C2C]" />
                  </a>
                  <a
                    href="https://explorer.altmempool.wtf/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#F2F2F2] border border-[#A9B2B1]/50 text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors cursor-pointer"
                  >
                    <span>Alt-Mempool Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            2.5 JUDGE & REVIEWER EVALUATION GUIDE (ZERO-FRICTION ONBOARDING)
        ───────────────────────────────────────────────────────────── */}
        <section className="py-10 bg-white swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="bg-[#1A1A1A] text-white p-6 md:p-8 swiss-border relative">
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
                    Target Bounty: EF Frame Mempool ($5,000)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-swiss-mono">
                {/* Step 1 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">01 / FASTEST PATH (ZERO SETUP)</div>
                    <p className="text-[#A9B2B1] leading-relaxed">
                      Hackathon judges do not need to install extensions or configure custom RPCs. 
                      Click <strong className="text-white">CONNECT WALLET</strong> and select <strong className="text-white">Pre-Funded Demo Account</strong> (or click below) to instantly load our 
                      pre-funded live devnet account (<code className="text-[#D82C2C]">0x08cf...</code>).
                    </p>
                  </div>
                  <button
                    onClick={connectDemoAccount}
                    className="w-full py-2 bg-[#D82C2C] hover:bg-[#b02222] text-white font-bold transition-colors cursor-pointer text-center mt-2"
                  >
                    ACTIVATE DEMO ACCOUNT (1.0 ETH)
                  </button>
                </div>

                {/* Step 2 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">02 / TESTING WITH YOUR WALLET</div>
                    <p className="text-[#A9B2B1] leading-relaxed">
                      Connect Coinbase Wallet or MetaMask. If your wallet is on Sepolia, our 
                      1-click network switcher will automatically configure the Hegotá Devnet (<code className="text-white">Chain 3151908</code>) 
                      and add the Ethrex RPC (<code className="text-white">rpc1.hegota.ethrex.xyz</code>).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-white/60">Official Hegotá Faucet (1.0 ETH):</span>
                    <a
                      href="https://faucet.hegota.ethrex.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#D82C2C] hover:underline truncate mt-0.5"
                    >
                      faucet.hegota.ethrex.xyz &rarr;
                    </a>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3 bg-white/5 p-4 border border-white/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-[#D82C2C] font-bold text-sm">03 / WHY NOT SEPOLIA ETH?</div>
                    <p className="text-[#A9B2B1] leading-relaxed">
                      Standard Sepolia EVM runs Cancun/Prague without EIP-8141 opcodes. Calling opcode 
                      <code className="text-[#D82C2C]"> 0xAA (APPROVE)</code> on Sepolia throws <code className="text-white">INVALID OPCODE</code>. 
                      The Hegotá devnet runs <strong>Ethrex</strong>, the first client implementing EIP-8141 frame transactions natively.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-white/60">Live Deployed Contract:</span>
                    <div className="text-white font-bold truncate mt-0.5">0xe5c5...483B (Mined)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. THE 3-STATE ADMISSION CONTRAST (THE CORE MECHANIC)
        ───────────────────────────────────────────────────────────── */}
        <section id="architecture" className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-12">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              03 / PROTOCOL VALIDATION CONTRAST
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
              The Three-State Mempool Admission Matrix
            </h2>
            <p className="text-base text-[#1A1A1A]/75 max-w-2xl mt-2">
              Demonstrating the exact conditions under which quantum-resistant validation loops fail 
              and succeed across canonical nodes versus staked ERC-8421 sidecars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* State 1 */}
            <div className="bg-white p-6 swiss-border relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 swiss-border-b text-xs font-swiss-mono">
                  <span className="text-[#A9B2B1]">SHOT 01</span>
                  <span className="text-[#D82C2C] font-bold">REJECTED</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-[#D82C2C]" />
                  <h3 className="font-bold text-lg font-swiss-display">Canonical Node</h3>
                </div>
                <p className="text-sm text-[#1A1A1A]/70 mt-3 leading-relaxed">
                  Sent directly to canonical Ethrex node without alternative mempool routing. 
                  Validation gas reaches <strong>259,247 gas</strong>. The node enforces the 
                  100,000 gas ceiling and immediately drops the transaction.
                </p>
              </div>

              <div className="mt-6 pt-4 swiss-border-t font-swiss-mono text-xs space-y-1 bg-[#F2F2F2] p-3">
                <div className="text-[#A9B2B1] text-[10px]">NODE REASON</div>
                <div className="text-[#D82C2C] font-semibold break-all">
                  validation frame gas limit exceeded: 259247 &gt; 100000
                </div>
              </div>
            </div>

            {/* State 2 */}
            <div className="bg-white p-6 swiss-border relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 swiss-border-b text-xs font-swiss-mono">
                  <span className="text-[#A9B2B1]">SHOT 02</span>
                  <span className="text-[#D82C2C] font-bold">REJECTED</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-[#D82C2C]" />
                  <h3 className="font-bold text-lg font-swiss-display">Unstaked Alt Mempool</h3>
                </div>
                <p className="text-sm text-[#1A1A1A]/70 mt-3 leading-relaxed">
                  Sent to the Skandha alt-mempool gateway while the sender address holds zero stake in the 
                  <code className="text-xs bg-[#F2F2F2] px-1 py-0.5">NaiveStakingRegistry</code>. 
                  The sidecar restricts unstaked participants to standard limits.
                </p>
              </div>

              <div className="mt-6 pt-4 swiss-border-t font-swiss-mono text-xs space-y-1 bg-[#F2F2F2] p-3">
                <div className="text-[#A9B2B1] text-[10px]">SIDECAR REASON</div>
                <div className="text-[#D82C2C] font-semibold break-all">
                  entity unstaked: quota 100000 gas (stake min 0.01 ETH)
                </div>
              </div>
            </div>

            {/* State 3 */}
            <div className="bg-[#1A1A1A] text-white p-6 border-2 border-[#1A1A1A] relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/20 text-xs font-swiss-mono">
                  <span className="text-white/60">SHOT 03</span>
                  <span className="text-emerald-400 font-bold">ADMITTED & MINED</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-lg font-swiss-display text-white">Staked Alt Mempool</h3>
                </div>
                <p className="text-sm text-white/80 mt-3 leading-relaxed">
                  Sender deposits 0.012 ETH stake into <code className="text-xs bg-white/10 px-1 py-0.5">NaiveStakingRegistry</code>. 
                  The sidecar unlocks the <strong>1,000,000 gas</strong> allowance. The heavy post-quantum 
                  validation succeeds and gets included in the next block.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20 font-swiss-mono text-xs space-y-1 bg-white/5 p-3">
                <div className="text-white/60 text-[10px]">STATUS</div>
                <div className="text-emerald-400 font-semibold">
                  Admitted to mempool · Bundled · Status: 0x1 Mined
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3.5 ARCHITECTURAL CONTRIBUTION: KEYED NONCES (EIP-8250)
        ───────────────────────────────────────────────────────────── */}
        <section className="py-16 bg-white swiss-border-t">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-10">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-[#D82C2C] inline-block" />
                <span>03.5 / CORE ARCHITECTURAL DIFFERENTIATOR</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
                Keyed Nonces for Post-Quantum One-Time Signatures (EIP-8250)
              </h2>
              <p className="text-base text-[#1A1A1A]/75 max-w-3xl mt-2 leading-relaxed">
                Hash-based post-quantum schemes (WOTS+, SPHINCS+) use <strong>One-Time Signature (OTS)</strong> keys. 
                In a standard mempool, fee-bumping (Replace-By-Fee) breaks security because re-signing reveals 
                multiple signatures under the same OTS leaf. Q-Frame resolves this by mapping OTS leaves directly to 
                <strong> EIP-8250 2D Nonce Keys</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch font-swiss-mono text-xs">
              {/* Failure Mode Card */}
              <div className="p-6 bg-red-50/60 border-2 border-red-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-red-200">
                    <span className="text-red-900 font-bold uppercase">The Linear Nonce Failure Mode</span>
                    <span className="bg-[#D82C2C] text-white text-[10px] px-1.5 py-0.5 font-bold uppercase">Catastrophic</span>
                  </div>
                  <div className="mt-4 space-y-3 text-[#1A1A1A]">
                    <div className="p-3 bg-white border border-red-200 font-mono text-[11px]">
                      [Tx 1: Nonce 42] &rarr; Signed with Leaf #7 (Pending in Mempool)
                    </div>
                    <div className="text-center text-red-600 font-bold text-xs">&darr; Gas spikes; sender attempts Replace-By-Fee (RBF) &darr;</div>
                    <div className="p-3 bg-white border border-red-300 font-mono text-[11px] text-[#D82C2C]">
                      [Tx 2: Nonce 42] &rarr; Re-signed with Leaf #7 at higher maxFeePerGas
                    </div>
                    <p className="text-red-950 text-xs leading-relaxed pt-2">
                      <strong>Security Annihilated:</strong> Two distinct signatures now exist for the same WOTS+ leaf. 
                      An adversary computes chain intersections and forges arbitrary transactions.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-red-200 text-[11px] text-red-700">
                  Standard EVM lacks channel separation for stateful cryptographic keys.
                </div>
              </div>

              {/* Solution Card */}
              <div className="p-6 bg-[#1A1A1A] text-white swiss-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/20">
                    <span className="text-[#D82C2C] font-bold uppercase">The Q-Frame EIP-8250 Architecture</span>
                    <span className="bg-emerald-500 text-[#1A1A1A] text-[10px] px-1.5 py-0.5 font-bold uppercase">Live on Devnet</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-white/10 border border-white/20 font-mono text-[11px]">
                      Channel (Key #7, Seq 0) &rarr; One-Time Sign &amp; Mine (Leaf #7 retired, Seq &rarr; 1)
                    </div>
                    <div className="text-center text-[#D82C2C] font-bold text-xs">&darr; Concurrent Independent Channels (nonceKey = leafIndex) &darr;</div>
                    <div className="p-3 bg-white/10 border border-emerald-500/50 font-mono text-[11px] text-emerald-400">
                      Channel (Key #8, Seq 0) &rarr; Concurrently pending in mempool without queue blocking
                    </div>
                    <p className="text-[#A9B2B1] text-xs leading-relaxed pt-2">
                      <strong>Protocol-Enforced Invariant:</strong> The devnet&apos;s <code className="text-white">NONCE_MANAGER</code> predeploy (<code className="text-white">0x...8250</code>) 
                      tracks channel retirement on-chain. Replay on an exhausted leaf is rejected at the mempool validation boundary before bytecode execution.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">Verified in step_12_tx_keyed_nonces</span>
                  <span className="text-white/60">Ethrex Native 2D Nonce</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. INTERACTIVE GAS & ADMISSION SIMULATOR
        ───────────────────────────────────────────────────────────── */}
        <section id="simulator" className="py-20 bg-[#F2F2F2] swiss-border-t swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="mb-10">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                04 / REAL-TIME MATHEMATICAL SIMULATOR
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
                Post-Quantum Gas Curve & Admission Simulator
              </h2>
              <p className="text-sm sm:text-base text-[#1A1A1A]/70 max-w-xl mt-1">
                Adjust the hash-chain parameters to simulate cryptographic signature workloads 
                and observe real-time admission decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Controls Column (7 cols) */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 swiss-border shadow-sm space-y-8">
                
                {/* Chains Control */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-swiss-mono">
                    <span className="font-semibold text-[#1A1A1A]">Hash Chains Count (W-OTS+):</span>
                    <span className="px-2.5 py-0.5 bg-[#1A1A1A] text-white text-xs font-bold font-swiss-mono">
                      {chains} Chains
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={chains}
                    onChange={(e) => setChains(Number(e.target.value))}
                    className="w-full cursor-pointer h-2 bg-[#F2F2F2] rounded-none appearance-none"
                  />
                  <div className="flex justify-between text-[11px] font-swiss-mono text-[#A9B2B1]">
                    <span>1 (Trivial Toy Hash)</span>
                    <span>15 (Calibrated NIST FIPS 205)</span>
                    <span>25 (High Security Bound)</span>
                  </div>
                </div>

                {/* Iterations Control */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-swiss-mono">
                    <span className="font-semibold text-[#1A1A1A]">Iterations Per Chain:</span>
                    <span className="px-2.5 py-0.5 bg-[#1A1A1A] text-white text-xs font-bold font-swiss-mono">
                      {iterations} Iterations
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    className="w-full cursor-pointer h-2 bg-[#F2F2F2] rounded-none appearance-none"
                  />
                  <div className="flex justify-between text-[11px] font-swiss-mono text-[#A9B2B1]">
                    <span>5 Iterations</span>
                    <span>20 (Calibrated Baseline)</span>
                    <span>50 (Extreme Stress Test)</span>
                  </div>
                </div>

                {/* Live Formula Callout */}
                <div className="p-4 bg-[#F2F2F2] border-l-4 border-[#D82C2C] text-xs font-swiss-mono space-y-1">
                  <div className="text-[#A9B2B1] font-semibold text-[10px]">CALIBRATED EQUATION (FROM FOUNDRY RUNNER)</div>
                  <div className="text-[#1A1A1A] font-bold">
                    Gas = 37,247 + ({chains} × {iterations} × 740) = {calculatedGas.toLocaleString()} Gas
                  </div>
                </div>

              </div>

              {/* Simulation Result Column (5 cols) */}
              <div className="lg:col-span-5 bg-white p-6 sm:p-8 swiss-border shadow-sm space-y-6">
                <div className="text-xs font-swiss-mono text-[#A9B2B1] uppercase pb-2 swiss-border-b flex justify-between">
                  <span>SIMULATED ADMISSION REPORT</span>
                  <span>OP: APPROVE</span>
                </div>

                <div>
                  <div className="text-xs font-swiss-mono text-[#A9B2B1]">CALCULATED VERIFICATION GAS</div>
                  <div className="text-4xl font-extrabold font-swiss-display text-[#1A1A1A] mt-1">
                    {calculatedGas.toLocaleString()} <span className="text-sm font-swiss-mono text-[#A9B2B1]">GAS</span>
                  </div>
                </div>

                {/* Status 1: Canonical Mempool */}
                <div className="p-4 swiss-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-swiss-mono">
                    <span className="text-[#A9B2B1]">CANONICAL ETHEREUM POOL (100k CAP)</span>
                    {isCanonicalRejected ? (
                      <span className="text-[#D82C2C] font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> REJECTED
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ADMITTED
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#F2F2F2] h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full ${isCanonicalRejected ? "bg-[#D82C2C]" : "bg-emerald-500"}`}
                      style={{
                        width: `${Math.min(100, (calculatedGas / canonicalCap) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-swiss-mono text-[#A9B2B1] pt-1">
                    {isCanonicalRejected
                      ? `Exceeds canonical DoS limit by ${(calculatedGas - canonicalCap).toLocaleString()} gas`
                      : `Within 100,000 gas limit`}
                  </div>
                </div>

                {/* Status 2: Q-Frame Staked Alt Mempool */}
                <div className="p-4 bg-[#1A1A1A] text-white space-y-1">
                  <div className="flex items-center justify-between text-xs font-swiss-mono">
                    <span className="text-white/60">Q-FRAME STAKED POOL (1.0M CAP)</span>
                    {isAltMempoolAdmitted ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ADMITTED & MINED
                      </span>
                    ) : (
                      <span className="text-[#D82C2C] font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> EXCEEDED 1M CAP
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-white/20 h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full ${isAltMempoolAdmitted ? "bg-emerald-400" : "bg-[#D82C2C]"}`}
                      style={{
                        width: `${Math.min(100, (calculatedGas / altMempoolCap) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-swiss-mono text-white/60 pt-1">
                    {isAltMempoolAdmitted
                      ? `${((calculatedGas / altMempoolCap) * 100).toFixed(1)}% of 1,000,000 gas allowance utilized`
                      : "Exceeds alternative mempool limit"}
                  </div>
                </div>

                {/* Connected Wallet On-Chain Interaction */}
                <div className="p-4 bg-[#F2F2F2] swiss-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-swiss-mono">
                    <span className="font-bold text-[#1A1A1A]">ON-CHAIN STAKE ACTION</span>
                    {walletAddress ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> WALLET READY
                      </span>
                    ) : (
                      <span className="text-[#A9B2B1]">WALLET NOT CONNECTED</span>
                    )}
                  </div>

                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed font-swiss-mono">
                    {walletAddress
                      ? `Connected as ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}. Deposit 0.012 ETH stake to unlock the 1,000,000 gas allowance.`
                      : "Connect your Web3 wallet (MetaMask, Coinbase Wallet) to deposit stake and test this live on-chain."}
                  </p>

                  {walletError && (
                    <div className="p-2.5 bg-red-50 text-[#D82C2C] text-xs font-swiss-mono border border-red-200">
                      {walletError}
                    </div>
                  )}

                  {txSuccessHash && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-swiss-mono border border-emerald-300 space-y-2">
                      <div className="font-bold flex items-center justify-between">
                        <span>STAKE TRANSACTION BROADCAST:</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 font-bold uppercase">
                          Mined (0x1)
                        </span>
                      </div>
                      <div className="break-all font-mono text-[11px] text-[#1A1A1A]">{txSuccessHash}</div>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        <a
                          href={`https://dora.hegota.ethrex.xyz/tx/${txSuccessHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D82C2C] hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>View on Dora Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[#A9B2B1]">·</span>
                        <a
                          href="https://explorer.altmempool.wtf/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1A1A1A] hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>View on Alt-Mempool Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {faucetStatus && (
                    <div className="p-2.5 bg-blue-50 text-[#0033A0] text-xs font-swiss-mono border border-blue-200 break-all">
                      {faucetStatus}
                    </div>
                  )}

                  {walletAddress ? (
                    <div className="space-y-2">
                      <button
                        onClick={handleSimulateStake}
                        disabled={isStakingTx}
                        className="w-full btn-swiss-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isStakingTx ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>PROCESSING ON-CHAIN TX...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>STAKE 0.012 ETH (UNLOCK 1M GAS)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => claimFaucet()}
                        disabled={isClaimingFaucet}
                        className="w-full btn-swiss-secondary py-2 text-xs font-swiss-mono flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isClaimingFaucet ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>REQUESTING 1.0 ETH FROM FAUCET...</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>CLAIM 1.0 ETH FROM DEVNET FAUCET</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="w-full btn-swiss-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{isConnecting ? "CHECK EXTENSION POPUP..." : "CONNECT WALLET TO TEST"}</span>
                      </button>

                      <button
                        onClick={connectDemoAccount}
                        className="w-full btn-swiss-secondary py-2 text-xs font-swiss-mono flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>USE PRE-FUNDED DEMO ACCOUNT (1.0 ETH ON HEGOTÁ)</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. GAS BENCHMARKS CALIBRATION TABLE
        ───────────────────────────────────────────────────────────── */}
        <section id="benchmarks" className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-10">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              05 / EMPIRICAL DATA
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
              Foundry Test Calibration Curves
            </h2>
            <p className="text-sm text-[#1A1A1A]/70 max-w-xl mt-1">
              Direct telemetry from <code className="text-xs bg-[#F2F2F2] px-1 py-0.5">contracts/test/GasCurveTest.t.sol</code> passing 13 / 13 tests.
            </p>
          </div>

          <div className="overflow-x-auto swiss-border">
            <table className="w-full text-left border-collapse text-xs sm:text-sm font-swiss-mono">
              <thead>
                <tr className="bg-[#1A1A1A] text-white">
                  <th className="p-4 border-r border-white/20">CONFIG PROFILE</th>
                  <th className="p-4 border-r border-white/20">CHAINS × ITERS</th>
                  <th className="p-4 border-r border-white/20">VERIFICATION GAS</th>
                  <th className="p-4 border-r border-white/20">CANONICAL (100K)</th>
                  <th className="p-4">STAKED ALT MEMPOOL (1M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6E6]">
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">NIST Minimal Bound</td>
                  <td className="p-4 border-r border-[#E2E6E6]">4 × 10</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">66,847 Gas</td>
                  <td className="p-4 text-emerald-600 font-bold border-r border-[#E2E6E6]">Admitted</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted</td>
                </tr>
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">Threshold Cross</td>
                  <td className="p-4 border-r border-[#E2E6E6]">8 × 15</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">126,047 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted</td>
                </tr>
                <tr className="bg-[#D82C2C]/5 font-semibold hover:bg-[#D82C2C]/10 transition-colors">
                  <td className="p-4 border-r border-[#E2E6E6] text-[#D82C2C]">
                    ★ Q-Frame Calibrated (FIPS 205)
                  </td>
                  <td className="p-4 border-r border-[#E2E6E6] text-[#D82C2C]">15 × 20</td>
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
                  <td className="p-4 border-r border-[#E2E6E6]">20 × 30</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">481,247 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted (Safely &lt;1M)</td>
                </tr>
                <tr className="hover:bg-[#F2F2F2]/50 transition-colors">
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">Stress Max Limit</td>
                  <td className="p-4 border-r border-[#E2E6E6]">30 × 40</td>
                  <td className="p-4 font-bold border-r border-[#E2E6E6]">925,247 Gas</td>
                  <td className="p-4 text-[#D82C2C] font-bold border-r border-[#E2E6E6]">Rejected (&gt;100k)</td>
                  <td className="p-4 text-emerald-600 font-bold">Admitted (Peak Limit)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            7. PRICING / STAKING & VERIFICATION TIERS (3 TIERS)
        ───────────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 bg-[#F2F2F2] swiss-border-t swiss-border-b">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
                06 / ECONOMIC INCENTIVE DESIGN
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-2">
                Mempool Staking & Verification Tiers
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
                      <span className="font-bold">1,000,000 Validation Gas (+900%)</span>
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
                  <a
                    href="#simulator"
                    className="w-full block text-center py-3.5 text-xs font-swiss-mono bg-[#D82C2C] hover:bg-[#b02222] text-white font-bold transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Simulate Staked Flow
                  </a>
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
            8. TESTIMONIALS / PROTOCOL RESEARCH CITATIONS (3 CARDS)
        ───────────────────────────────────────────────────────────── */}
        <section className="py-20 max-w-[1280px] mx-auto px-6">
          <div className="mb-12">
            <div className="text-xs font-swiss-mono text-[#D82C2C] uppercase font-bold tracking-wider">
              07 / SCIENTIFIC CONTEXT
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-swiss-display text-[#1A1A1A] mt-1">
              Cryptographic Standards & Framework Citations
            </h2>
            <p className="text-sm text-[#1A1A1A]/70 max-w-xl mt-1">
              Grounding Q-Frame within official NIST standards and Ethereum Foundation specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Citation 1 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed">
                “Stateless hash-based signatures standardized in NIST FIPS 205 (SLH-DSA) guarantee security against quantum computers, but require evaluating deep hash trees that far exceed existing blockchain validation bounds.”
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">NIST FIPS 205</div>
                <div className="text-xs font-swiss-mono text-[#A9B2B1]">Post-Quantum Cryptography Standard</div>
              </div>
            </div>

            {/* Citation 2 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed">
                “EIP-8141 introduces frame transactions so verification, execution, and gas sponsorship are decoupled. The APPROVE opcode formalizes valid authorization without requiring full account abstraction predeploys.”
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">EIP-8141 Spec</div>
                <div className="text-xs font-swiss-mono text-[#A9B2B1]">Frame Transactions Core Draft</div>
              </div>
            </div>

            {/* Citation 3 */}
            <div className="p-6 bg-white swiss-border flex flex-col justify-between">
              <p className="text-sm text-[#1A1A1A]/85 italic leading-relaxed">
                “ERC-8421 establishes alternative mempools with reputation staking. By holding economic stake in a registry contract, participants protect nodes from uncompensated computation.”
              </p>
              <div className="mt-6 pt-4 swiss-border-t">
                <div className="font-bold text-sm font-swiss-display text-[#1A1A1A]">ERC-8421 &amp; Ethrex</div>
                <div className="text-xs font-swiss-mono text-[#A9B2B1]">LambdaClass &amp; EF Research</div>
              </div>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            9. FINAL IMPACTFUL CTA (SWISS ASYMMETRICAL POSTER)
        ───────────────────────────────────────────────────────────── */}
        <section className="bg-[#1A1A1A] text-white py-16 px-6 relative overflow-hidden">
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-block px-2.5 py-1 bg-[#D82C2C] text-white text-xs font-swiss-mono font-bold">
                SUBMISSION ARTIFACT · ETHGLOBAL MUMBAI 2026
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-swiss-display leading-tight">
                VERIFIABLE POST-QUANTUM READINESS FOR ETHEREUM.
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-xl">
                Code authored from scratch, 100% passing test suites, and live on-chain deployment on the Hegotá Ethrex Devnet.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-3">
              <a
                href="#evidence"
                className="btn-swiss-primary text-center px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Inspect On-Chain Contract
              </a>
              <a
                href="#simulator"
                className="btn-swiss-secondary border-white text-white hover:bg-white hover:text-[#1A1A1A] text-center px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Launch Gas Simulator
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER (SWISS TYPOGRAPHIC GRID)
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white swiss-border-t py-12 text-xs font-swiss-mono text-[#1A1A1A]">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 bg-[#D82C2C]" />
              <span className="font-bold text-sm tracking-tight font-swiss-display">Q-FRAME</span>
            </div>
            <p className="text-[#A9B2B1] leading-relaxed">
              Post-Quantum Frame Transactions &amp; Staked Alternative Mempools.
              Built for ETHGlobal Mumbai 2026.
            </p>
            <div className="mt-4 text-[#A9B2B1]">
              © 2026 Q-Frame Protocol. MIT License.
            </div>
          </div>

          <div>
            <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">DEVNET ENDPOINTS</div>
            <ul className="space-y-2 text-[#A9B2B1]">
              <li>Hegotá RPC: <code className="text-[#1A1A1A]">rpc1.hegota.ethrex.xyz</code></li>
              <li>Chain ID: <code className="text-[#1A1A1A]">3151908 &amp; 1337</code></li>
              <li>Explorer: <code className="text-[#1A1A1A]">dora.hegota.ethrex.xyz</code></li>
              <li>Sidecar: <code className="text-[#1A1A1A]">altmempoolgateway</code></li>
            </ul>
          </div>

          <div>
            <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">REPOSITORY ARTIFACTS</div>
            <ul className="space-y-2 text-[#A9B2B1]">
              <li><a href="#" className="hover:text-[#D82C2C] transition-colors">PQBenchmarkAccount.sol</a></li>
              <li><a href="#" className="hover:text-[#D82C2C] transition-colors">GasCurveTest.t.sol</a></li>
              <li><a href="#" className="hover:text-[#D82C2C] transition-colors">step_pq_benchmark.ts</a></li>
              <li><a href="#" className="hover:text-[#D82C2C] transition-colors">CHECKPOINT_1A.md</a></li>
            </ul>
          </div>

          <div>
            <div className="font-bold uppercase text-[11px] mb-3 text-[#1A1A1A]">BOUNTY TRACK</div>
            <ul className="space-y-2 text-[#A9B2B1]">
              <li className="text-[#1A1A1A] font-semibold">Ethereum Foundation ($5,000)</li>
              <li>Frame Tx Alternative Mempool</li>
              <li>Status: From Scratch Submission</li>
              <li>Venue: ETHGlobal Mumbai</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
