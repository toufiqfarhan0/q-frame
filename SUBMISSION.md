# ETHGlobal Mumbai 2026 — Project Submission Form

## 1. Project Overview

* **Project Name:** Q-FRAME
* **Tagline:** Post-Quantum Frame Transactions & EIP-8250 2D Keyed Nonces on Staked Alternative Mempools with Arkiv DB-Chain.
* **Track / Bounties Targeted:**
  1. **Arkiv Network** — Best use of Arkiv DB-Chain (Native auto-expiring ephemeral leaf journal on Rabdi Testnet).
  2. **Ethrex / Alternative Mempools** — EIP-8141 Frame Transactions & ERC-8421 Staking on Hegotá Devnet.

---

## 2. Problem Description

Quantum computers running Shor's algorithm will compromise Ethereum's ECDSA cryptography. While NIST has standardized quantum-resistant algorithms (NIST FIPS 205 / SLH-DSA / SPHINCS+), verifying their deep hash trees requires **260,000+ gas**—far exceeding Ethereum’s 100,000 gas canonical mempool validation ceiling. Unstaked high-gas validation opens nodes to denial-of-service (DoS) attacks.

Furthermore, post-quantum One-Time Signatures (OTS) introduce a cryptographic trap: **keys can never sign twice without exposing hash-chain intersections that allow forgers to steal funds**. 
* Linear nonces create severe head-of-line blocking across concurrent transactions.
* Traditional Replace-By-Fee (RBF) re-signs under the same nonce, catastrophically destroying key security.
* Multi-device wallet coordination without central servers risks abandoned leaf channel reservations if mempool transactions drop unmined.

---

## 3. Solution & Architecture

**Q-FRAME** delivers a complete post-quantum execution pipeline:

1. **EIP-8141 Frame Transactions**: Decouples verification, execution, and gas sponsorship via the `APPROVE` opcode without requiring heavyweight account abstraction predeploys.
2. **ERC-8421 Staked Alternative Mempool on Hegotá Devnet**: Requires senders to stake economic collateral (0.012 ETH). Staked senders unlock an expanded 2,000,000 gas validation envelope; uncompensated revert attempts are slashed to protect nodes.
3. **EIP-8250 2D Keyed Nonces**: Derives 12 isolated parallel leaf channels (`Leaves 0..11`) enabling concurrent post-quantum transactions without nonce collisions.
4. **Cryptographic Safe Fee-Bumping**: When gas spikes, Q-FRAME permanently **BURNS** the exposed OTS leaf key and allocates a fresh channel for higher-gas re-submission, preserving OTS security invariants.
5. **Zero-State Device Recovery**: Scans on-chain sequence storage on a fresh device and applies an automated +16 Safety Gap, resuming allocation safely past dropped mempool transactions.
6. **Arkiv DB-Chain Ephemeral Journal**: Synchronizes leaf channel reservations on **Arkiv Rabdi Testnet (Chain ID 7794095)** using native 10-minute auto-expiring TTLs (`ExpirationTime.fromMinutes(10)`). Dropped mempool transactions automatically self-prune without central databases.
7. **Production SDK (`q-frame-sdk`)**: Packaged NPM distribution (v0.1.1) bundling `LeafManager` and native Arkiv client, validated by an independent third-party consumer app on port 3001 with 100% test pass rates.

---

## 4. How It Was Built

* **Smart Contracts (Solidity & Foundry)**:
  * Implemented EIP-8141 Frame Transaction validation and ERC-8421 Stake Registry.
  * Deployed and verified on Ethrex Hegotá Devnet (Chain ID `3151908`).
* **Arkiv DB-Chain (Rabdi Testnet `7794095`)**:
  * Integrated `@arkiv-network/sdk` v1.0.1.
  * Defined schema `qframe.leaf-journal` with 4 indexed columns and 10-minute native TTL.
  * Live confirmed entities on Rabdi Explorer (e.g. Entity Key: `0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d`).
* **SDK (`q-frame-sdk`)**:
  * Built using TypeScript, Viem, and Tsup generating dual CommonJS/ESM outputs and type declarations.
  * Bundled Arkiv client directly with zero-config methods (`manager.syncWithArkiv()`, `manager.publishToArkiv()`).
* **Frontend Web Studio**:
  * Next.js 16 (Turbopack) with Swiss International Typographic Design system.
  * EIP-6963 multi-wallet discovery (MetaMask, Phantom, Rabby, Coinbase).
  * Interactive 12-channel visual state grid and Write-Ahead Journal viewer with LocalStorage persistence.

---

## 5. Scientific Citations & Author Credits

* **NIST FIPS 205 (SLH-DSA)**: D. Cooper, D. Apon, R. Perlner, A. Robinson, C. Miller (NIST) · SPHINCS+ Designers: D.J. Bernstein, P. Schwabe et al.
* **EIP-8141 Frame Transactions**: Vitalik Buterin, Yoav Weiss, Alex Forshtat, Dror Tirosh, Shahaf Nacson.
* **ERC-8421 & Ethrex Client**: Federico Carrone & LambdaClass Team · Ethereum Foundation Research.
* **Arkiv DB-Chain & EIP-8250**: Arkiv Network Architecture Team · Golem Factory.

---

## 6. Project Links

* **GitHub Repository:** [https://github.com/toufiqfarhan0/q-frame](https://github.com/toufiqfarhan0/q-frame)
* **Arkiv Explorer Verified Entity:** [https://rabdi.explorer.arkiv.network/search?q=0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d](https://rabdi.explorer.arkiv.network/search?q=0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d)
* **Arkiv Track Deliverables Folder:** `/arkiv/` (`schema.md`, `why-arkiv.md`, `how-you-use-arkiv.md`, `reach.md`, `friction.md`, `feedback.md`)
