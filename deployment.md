# Q-Frame Hegotá Devnet Deployment

**Network:** Hegotá Ethrex Devnet (`chainId: 3151908` / `0x301824`)  
**Execution Client:** [Ethrex](https://github.com/forshtat/ethrex) branch `eip8141-tracer` (commit `9aa3645d`)  
**Deployment Date:** 5–6 November 2026  
**Status:** All broadcast transactions confirmed and mined successfully.

This is the canonical deployment record for the Q-Frame submission at ETHGlobal Mumbai 2026. It contains every non-zero address and confirmed transaction hash used or created by this deployment.

---

## Complete Address Inventory

| Role | Address | Notes |
|---|---|---|
| Deployer / Participant Account | [`0x08cfae005698Fae83cA442FfEFb69c58904cFf9c`](https://dora.hegota.ethrex.xyz/address/0x08cfae005698Fae83cA442FfEFb69c58904cFf9c) | Funded with 1.0 ETH via public devnet faucet. Deployed contracts and executes verification benchmarks. |
| PQBenchmarkAccount | [`0xe5c5A34833db3A90E30adCD98f2955E36496483B`](https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B) | Verified Solidity 0.8.24 contract with 7,100 bytes deployed bytecode. Implements native EIP-8141 execution frame verification hooks (`HegotaSupport`). |
| NaiveStakingRegistry | `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f` | ERC-8421 on-chain staking contract; keyed by `msg.sender`. Unlocks 1,000,000 gas limit for stakes $\ge 0.01\text{ ETH}$. |
| Nonce Manager Predeploy (EIP-8250) | `0x0000000000000000000000000000000000008250` | 2D Keyed Nonce manager (`NONCE_MANAGER`). Maps post-quantum OTS leaf indices to isolated monotonic sequence channels. |
| Recent Roots Predeploy (EIP-8272) | `0x0000000000000000000000000000000000008272` | Historical state root commitment verifier (`RECENT_ROOT_ADDRESS`) from EIPs PR #12131. |
| Alt-Mempool EntryPoint Sentinel | `0x00000000000000000000000000000000000000aa` | Sentinel entry-point address utilized by the sidecar gateway for frame transaction routing. |
| Demo Transfer Recipient | `0x8943545177806ED17B9F23F0a21ee5948eCaa776` | Fixed recipient for execution frames and payload deliveries. |

---

## Libraries and Internal Helper Contracts

`HegotaSupport` is the base contract inherited by `PQBenchmarkAccount`. During contract deployment on the Hegotá devnet, `HegotaSupport` automatically deploys **seven internal helper contracts** (Yul bytecode accelerators) responsible for:
* `Approve` (`0xAA` opcode execution)
* `FrameParam` and `SigParam` (`0xAB` parameter load)
* `FrameDataCopy` and `FrameDataLoad` (`0xAC` payload copy)
* `TxParam` and `TxTrace` (`0xAD` transaction context tracing)

Because these seven helper contracts are instantiated during creation, the initial account nonce begins at `8` (rather than `1`), and deployment requires approximately **7.26M gas** on the devnet.

---

## Complete Transaction Record

All transactions are broadcast and indexed on the Hegotá Ethrex Devnet:

| Transaction Hash | Block | Status | Action / Address Created |
|---|:---:|:---:|---|
| [`0xee6466…572d36`](https://dora.hegota.ethrex.xyz/tx/0xee6466d786117aabbb642dd2bd21c5ad56f79d9277aa7fe7196c0e88ae572d36) | `1,317,596` | `0x1 (Success)` | Deployed `PQBenchmarkAccount` at `0xe5c5A34833db3A90E30adCD98f2955E36496483B`. Gas used: `7,264,101`. |
| [`0xfaae1e…80555c`](https://dora.hegota.ethrex.xyz/tx/0xfaae1e16367f7bacb9c8a836cc8cfda3d920a0eb6482549b736d50f51880555c) | `1,318,311` | `0x1 (Success)` | Called `execute(target, value, data)` on `PQBenchmarkAccount`. Gas used: `33,691`. |

---

## On-Chain Verification

The deployment and all executed transactions can be inspected directly on the public block explorers:

* **Contract Overview:** [`https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B`](https://dora.hegota.ethrex.xyz/address/0xe5c5A34833db3A90E30adCD98f2955E36496483B)
* **Alt-Mempool Explorer:** [`https://explorer.altmempool.wtf/`](https://explorer.altmempool.wtf/)
* **Official Hegotá Faucet:** [`https://faucet.hegota.ethrex.xyz/`](https://faucet.hegota.ethrex.xyz/)

