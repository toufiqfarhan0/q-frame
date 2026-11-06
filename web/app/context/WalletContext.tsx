"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";
const RPC_URL = "https://rpc1.hegota.ethrex.xyz";

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  connectingWalletName: string | null;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;
  connectWallet: () => void;
  connectSpecificWallet: (type: "metamask" | "phantom" | "coinbase" | "rabby" | "injected") => Promise<void>;
  connectWithProvider: (provider: any, label: string) => Promise<void>;
  cancelConnecting: () => void;
  disconnectWallet: () => void;
  chainId: string | null;
  switchToDevnet: () => Promise<void>;
  claimFaucet: (targetAddr?: string) => Promise<void>;
  isClaimingFaucet: boolean;
  faucetStatus: string | null;
  walletError: string | null;
  setWalletError: (err: string | null) => void;
  isStaked: boolean | null;
  setIsStaked: (staked: boolean | null) => void;
  isCheckingStake: boolean;
  checkOnChainStake: (addr?: string) => Promise<boolean>;
  activeProvider: any;
  discoveredWallets: EIP6963ProviderDetail[];
  getPhantomProvider: () => any;
  getMetaMaskProvider: () => any;
  getCoinbaseProvider: () => any;
  getRabbyProvider: () => any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const walletAddressRef = useRef<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isStaked, setIsStaked] = useState<boolean | null>(null);
  const [isCheckingStake, setIsCheckingStake] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [discoveredWallets, setDiscoveredWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [connectingWalletName, setConnectingWalletName] = useState<string | null>(null);

  // Helpers to resolve specific wallet providers (Phantom, MetaMask, Coinbase, Rabby, Injected)
  const getPhantomProvider = useCallback(() => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.phantom?.ethereum) return w.phantom.ethereum;
    if (w.ethereum?.providers?.length) {
      const p = w.ethereum.providers.find((prov: any) => prov.isPhantom);
      if (p) return p;
    }
    if (w.ethereum?.isPhantom) return w.ethereum;
    return null;
  }, []);

  const getMetaMaskProvider = useCallback(() => {
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
  }, []);

  const getCoinbaseProvider = useCallback(() => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.coinbaseWalletExtension) return w.coinbaseWalletExtension;
    if (w.ethereum?.providers?.length) {
      const cb = w.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
      if (cb) return cb;
    }
    if (w.ethereum?.isCoinbaseWallet) return w.ethereum;
    return null;
  }, []);

  const getRabbyProvider = useCallback(() => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    if (w.rabby) return w.rabby;
    if (w.ethereum?.providers?.length) {
      const r = w.ethereum.providers.find((p: any) => p.isRabby);
      if (r) return r;
    }
    if (w.ethereum?.isRabby) return w.ethereum;
    return null;
  }, []);

  const getAnyEthereumProvider = useCallback(() => {
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
  }, [getPhantomProvider, getMetaMaskProvider, getCoinbaseProvider, getRabbyProvider]);

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

  // Keep walletAddressRef synchronized
  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  // Check on-chain stake directly against NaiveStakingRegistry
  const checkOnChainStake = useCallback(async (addr?: string): Promise<boolean> => {
    const target = addr || walletAddressRef.current;
    if (!target) {
      setIsStaked(null);
      return false;
    }

    // 1. Check local storage cache or known staked devnet addresses
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`qframe_staked_${target.toLowerCase()}`);
      if (cached) {
        setIsStaked(true);
        return true;
      }
    }

    // Known address with confirmed on-chain collateral on Hegotá (Tx 0x85fed8fc...)
    if (target.toLowerCase() === "0xd886168001663855a8f1ea7ddea1393a074ee354".toLowerCase()) {
      setIsStaked(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `qframe_staked_${target.toLowerCase()}`,
          "0x85fed8fc020273d16f91608b609e46f022264811a3ee451ea64450a10498329f"
        );
      }
      return true;
    }

    setIsCheckingStake(true);
    try {
      const cleanAddr = target.toLowerCase().replace("0x", "").padStart(64, "0");
      // Selector for getDepositInfo(address): 0x5287ce12
      const calldata = "0x5287ce12" + cleanAddr;

      // Query both Gateway RPC (Chain 1337) and Hegotá RPC (Chain 3151908)
      const endpoints = [
        "https://altmempoolgateway.forshtat.com/rpc",
        "https://rpc1.hegota.ethrex.xyz",
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_call",
              params: [{ to: STAKING_REGISTRY, data: calldata }, "latest"],
            }),
          });
          const data = await res.json();
          if (data.result && data.result.length >= 66 && data.result !== "0x") {
            const stakeHex = data.result.slice(0, 66);
            const stakeWei = BigInt(stakeHex);
            const minStakeWei = 10000000000000000n; // 0.01 ETH
            if (stakeWei >= minStakeWei) {
              setIsStaked(true);
              if (typeof window !== "undefined") {
                localStorage.setItem(`qframe_staked_${target.toLowerCase()}`, "onchain");
              }
              return true;
            }
          }
        } catch {
          // ignore single RPC failure
        }
      }

      // Check localStorage once more as fallback
      const fallbackLocal =
        typeof window !== "undefined"
          ? localStorage.getItem(`qframe_staked_${target.toLowerCase()}`)
          : null;
      if (fallbackLocal) {
        setIsStaked(true);
        return true;
      }

      setIsStaked(false);
      return false;
    } catch (e) {
      console.warn("Failed to query on-chain stake:", e);
      const fallbackLocal =
        typeof window !== "undefined"
          ? localStorage.getItem(`qframe_staked_${target.toLowerCase()}`)
          : null;
      const isOk = !!fallbackLocal;
      setIsStaked(isOk);
      return isOk;
    } finally {
      setIsCheckingStake(false);
    }
  }, []);

  // Connect with specific provider
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
      if (typeof window !== "undefined") {
        localStorage.removeItem("qframe_wallet_disconnected");
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        walletAddressRef.current = accounts[0];
        setActiveProvider(provider);
        const currentChain = await provider.request({ method: "eth_chainId" });
        setChainId(currentChain);
        setIsWalletModalOpen(false);
        await checkOnChainStake(accounts[0]);
      }
    } catch (err: any) {
      setWalletError(err.message || `Failed to connect ${label}`);
    } finally {
      setIsConnecting(false);
      setConnectingWalletName(null);
    }
  };

  const connectSpecificWallet = async (
    type: "metamask" | "phantom" | "coinbase" | "rabby" | "injected"
  ) => {
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

  const disconnectWallet = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("qframe_wallet_disconnected", "true");
      }
      setWalletAddress(null);
      walletAddressRef.current = null;
      setActiveProvider(null);
      setIsStaked(null);
      setWalletError(null);
      setIsWalletModalOpen(false);

      // Attempt to revoke permissions on providers supporting EIP-2255 (MetaMask, etc.)
      const eth = activeProvider || getAnyEthereumProvider();
      if (eth && eth.request) {
        try {
          await eth.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // Unsupported or declined, local disconnection already persisted
        }
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  };

  const switchToDevnet = async () => {
    const eth = activeProvider || getAnyEthereumProvider();
    if (!eth || !eth.request) return;
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
      setWalletError("Please connect your wallet first to receive faucet testnet funds.");
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
      if (res.ok) {
        setFaucetStatus(`1.0 ETH successfully sent to ${addr.slice(0, 6)}...${addr.slice(-4)}`);
      } else {
        const text = await res.text();
        setFaucetStatus(`Faucet claim limit reached or unavailable: ${text.slice(0, 80)}`);
      }
    } catch (err: any) {
      setFaucetStatus(`Could not reach faucet: ${err.message}`);
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  useEffect(() => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (w && w.ethereum) {
      const isExplicitlyDisconnected =
        typeof window !== "undefined" &&
        localStorage.getItem("qframe_wallet_disconnected") === "true";

      if (!isExplicitlyDisconnected) {
        w.ethereum
          .request({ method: "eth_accounts" })
          .then((accounts: string[]) => {
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0]);
              walletAddressRef.current = accounts[0];
              checkOnChainStake(accounts[0]);
            }
          })
          .catch(() => {});
      }

      w.ethereum
        .request({ method: "eth_chainId" })
        .then((chain: string) => {
          setChainId(chain);
        })
        .catch(() => {});

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("qframe_wallet_disconnected");
          }
          setWalletAddress(accounts[0]);
          walletAddressRef.current = accounts[0];
          checkOnChainStake(accounts[0]);
        } else {
          setWalletAddress(null);
          walletAddressRef.current = null;
          setIsStaked(null);
        }
      };

      const handleChainChanged = (chain: string) => {
        setChainId(chain);
      };

      w.ethereum.on("accountsChanged", handleAccountsChanged);
      w.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (w.ethereum.removeListener) {
          w.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          w.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkOnChainStake]);

  return (
    <WalletContext.Provider
      value={{
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
        claimFaucet,
        isClaimingFaucet,
        faucetStatus,
        walletError,
        setWalletError,
        isStaked,
        setIsStaked,
        isCheckingStake,
        checkOnChainStake,
        activeProvider,
        discoveredWallets,
        getPhantomProvider,
        getMetaMaskProvider,
        getCoinbaseProvider,
        getRabbyProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

