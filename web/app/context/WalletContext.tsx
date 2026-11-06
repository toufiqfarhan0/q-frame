"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STAKING_REGISTRY = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";
const RPC_URL = "https://rpc1.hegota.ethrex.xyz";

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  chainId: string | null;
  switchToDevnet: () => Promise<void>;
  claimFaucet: (targetAddr?: string) => Promise<void>;
  isClaimingFaucet: boolean;
  faucetStatus: string | null;
  walletError: string | null;
  setWalletError: (err: string | null) => void;
  isStaked: boolean | null;
  isCheckingStake: boolean;
  checkOnChainStake: (addr?: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isStaked, setIsStaked] = useState<boolean | null>(null);
  const [isCheckingStake, setIsCheckingStake] = useState<boolean>(false);

  // Check on-chain stake directly against NaiveStakingRegistry
  const checkOnChainStake = useCallback(async (addr?: string): Promise<boolean> => {
    const target = addr || walletAddress;
    if (!target) {
      setIsStaked(null);
      return false;
    }
    setIsCheckingStake(true);
    try {
      const cleanAddr = target.toLowerCase().replace("0x", "").padStart(64, "0");
      const calldata = "0x4b789115" + cleanAddr; // getDepositInfo(address)

      const res = await fetch(RPC_URL, {
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
      if (data.result && data.result.length >= 66) {
        const stakeHex = data.result.slice(0, 66);
        const stakeWei = BigInt(stakeHex);
        const minStakeWei = 10000000000000000n; // 0.01 ETH
        const active = stakeWei >= minStakeWei;
        setIsStaked(active);
        return active;
      }
      setIsStaked(false);
      return false;
    } catch (e) {
      console.warn("Failed to query on-chain stake:", e);
      setIsStaked(false);
      return false;
    } finally {
      setIsCheckingStake(false);
    }
  }, [walletAddress]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setWalletError(null);
      const w = typeof window !== "undefined" ? (window as any) : null;
      if (!w || !w.ethereum) {
        setWalletError("No Web3 wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.");
        return;
      }
      const accounts = await w.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        const currentChain = await w.ethereum.request({ method: "eth_chainId" });
        setChainId(currentChain);
        setIsWalletModalOpen(false);
        await checkOnChainStake(accounts[0]);
      }
    } catch (err: any) {
      setWalletError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsStaked(null);
    setWalletError(null);
  };

  const switchToDevnet = async () => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (!w || !w.ethereum) return;
    try {
      await w.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x301824" }], // 3151908 in hex
      });
      setChainId("0x301824");
    } catch (switchError: any) {
      try {
        await w.ethereum.request({
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
      w.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          checkOnChainStake(accounts[0]);
        }
      });
      w.ethereum.request({ method: "eth_chainId" }).then((chain: string) => {
        setChainId(chain);
      });
      w.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          checkOnChainStake(accounts[0]);
        } else {
          setWalletAddress(null);
          setIsStaked(null);
        }
      });
      w.ethereum.on("chainChanged", (chain: string) => {
        setChainId(chain);
      });
    }
  }, [checkOnChainStake]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnecting,
        isWalletModalOpen,
        setIsWalletModalOpen,
        connectWallet,
        disconnectWallet,
        chainId,
        switchToDevnet,
        claimFaucet,
        isClaimingFaucet,
        faucetStatus,
        walletError,
        setWalletError,
        isStaked,
        isCheckingStake,
        checkOnChainStake,
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

