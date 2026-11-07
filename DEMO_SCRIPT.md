# Q-FRAME — 3:45 Demo Video Recording Script

> **Target Duration:** 3 Minutes 45 Seconds (Safety margin below ETHGlobal 4:00 limit)  
> **Rule Reminder:** Do not speed up video playback. Keep a steady, confident speaking pace (~135 wpm).

---

## Pre-Recording Checklist (Open 4 Tabs in Order)

1. **Tab 1:** `http://localhost:3000` *(Landing Page & Gas Simulator)*
2. **Tab 2:** `http://localhost:3000/studio` *(LeafManager Studio & Write-Ahead Journal)*
3. **Tab 3:** [Rabdi Explorer Entity Link](https://rabdi.explorer.arkiv.network/search?q=0x0f7395be3d55df77643bd1defb3110d251e3aa99f955ceaba74f79613a931d1d)
4. **Tab 4:** `http://localhost:3001` *(Independent SDK Consumer Verification App)*

---

## Second-by-Second Master Script

### Part 1: The Post-Quantum Dilemma & Gas Wall
* **Timecode:** `0:00 – 0:40` (40 seconds)
* **Tab:** **Tab 1** (`http://localhost:3000`)
* **Screen Action:** Start at top of hero. Scroll smoothly down to the **EIP-8141 vs Legacy Gas Simulator**.

#### Spoken Lines:
> "Hello! This is Q-Frame. When cryptographically relevant quantum computers arrive, Shor’s algorithm will break Ethereum’s ECDSA signatures.
>
> NIST has standardized post-quantum algorithms like FIPS 205 SLH-DSA, but evaluating their deep hash trees requires over 260,000 gas—far exceeding Ethereum’s 100,000 gas mempool validation limit.
>
> Even worse, post-quantum One-Time Signatures have a fatal trap: a leaf key can never sign twice under the same nonce without leaking its private key. Linear nonces cause head-of-line blocking, and traditional Replace-By-Fee destroys key security.
>
> Q-Frame solves this using EIP-8141 Frame Transactions, EIP-8250 2D Keyed Nonces, and Arkiv DB-Chain."

---

### Part 2: Parallel 2D Nonces & Write-Ahead Journal
* **Timecode:** `0:40 – 1:30` (50 seconds)
* **Tab:** **Tab 2** (`http://localhost:3000/studio`)
* **Screen Action:** Switch to Tab 2. On tab **"1. ALLOCATE"**, click **"Allocate Channel #0"**. Scroll slightly to point out the **Write-Ahead Journal** entry appearing at the bottom with the derived `nonceKey`.

#### Spoken Lines:
> "Here in the LeafManager Studio, we manage the cryptographic invariants of post-quantum accounts.
>
> Instead of fragile linear nonces, EIP-8250 derives 2D keyed nonces from the hash of the account address and leaf index. This gives the user 12 isolated, parallel execution channels.
>
> When I click 'Allocate Channel #0', the engine calculates the deterministic 2D nonce key, sets the state to PENDING, and instantly commits it to our persistent Write-Ahead Journal.
>
> Transactions across leaves 0 through 11 execute concurrently in the mempool without head-of-line blocking."

---

### Part 3: Cryptographic Safe Bump & Zero-State Recovery
* **Timecode:** `1:30 – 2:15` (45 seconds)
* **Tab:** **Tab 2** (`http://localhost:3000/studio`)
* **Screen Action:** Click **"2. SAFE BUMP"**. Select Leaf #0 and click **"Execute Safe Fee Bump"**. Then click **"3. RECOVERY"** and click **"Simulate Zero-State Recovery"** to highlight the `+16 Leaves` Safety Gap.

#### Spoken Lines:
> "When gas prices spike, you cannot use traditional Replace-By-Fee, because re-signing under the same nonce exposes hash-chain intersections and allows forgers to steal funds.
>
> Q-Frame introduces 'Safe Bump'. Clicking it permanently burns the exposed leaf index, advances to a higher fee tier, and allocates a fresh parallel channel.
>
> And if a user restores their wallet on a new device without local journals, our Zero-State Recovery queries on-chain state and automatically leaps forward past dropped mempool transactions with a plus-16 safety gap to guarantee zero key collisions."

---

### Part 4: Arkiv DB-Chain Time-Scoped Ephemeral Journal
* **Timecode:** `2:15 – 3:00` (45 seconds)
* **Tab:** **Tab 2** ➔ **Tab 3** (`https://rabdi.explorer.arkiv.network/...`)
* **Screen Action:** In Tab 2, click **"5. ARKIV"**. Point to the registered entity card and live countdown. Then switch immediately to **Tab 3** (Arkiv Rabdi Block Explorer).

#### Spoken Lines:
> "To synchronize reservations across devices without centralized servers, we integrate Arkiv DB-Chain on Rabdi testnet.
>
> When an allocation occurs, Q-Frame journals it to Arkiv with a native 10-minute time-to-live using the Arkiv SDK.
>
> Here on the live Rabdi Block Explorer, you can see our verified entity under schema `qframe.leaf-journal`. It stores the wallet, leaf index, and nonce key across indexed attributes with a live expiration countdown.
>
> If the transaction drops unmined, Arkiv automatically prunes the expired entry at the storage layer—eliminating dead mempool reservations without paying any cleanup gas."

---

### Part 5: Independent SDK Consumer & Scientific Citations
* **Timecode:** `3:00 – 3:45` (45 seconds)
* **Tab:** **Tab 4** (`http://localhost:3001`) ➔ **Tab 1** (`http://localhost:3000`)
* **Screen Action:** Switch to **Tab 4**. Click **"▶ Re-Run All E2E Tests"** to display all 8 green checkmarks. Switch back to **Tab 1** and scroll down to **Section 06 (Scientific Context)** showing author citations.

#### Spoken Lines:
> "Finally, we packaged this entire engine into `@q-frame/sdk`. Running here on port 3001 is an independent third-party consumer app running our published package.
>
> Clicking re-run executes all 8 end-to-end tests live against Hegotá devnet and Arkiv Rabdi testnet—validating 2D key derivation, on-chain nonce reads, fee bumping, and time-scoped Arkiv sync with a 100% pass rate.
>
> Grounded in official NIST FIPS 205 standards, EIP-8141 frame transactions, and Arkiv DB-Chain, Q-Frame makes Ethereum’s post-quantum transition practical, gas-efficient, and secure.
>
> Thank you!"

---

## Video Recording Transition Summary

```
0:00 [Tab 1: Landing / Gas Simulator] 
      └── Intro: Shor's algorithm, 260k gas wall, OTS nonce trap
0:40 [Tab 2: Studio - Allocate] 
      └── 2D Keyed nonces, 12 parallel channels, Write-Ahead Journal
1:30 [Tab 2: Studio - Safe Bump & Recovery] 
      └── Burn-on-bump invariant, +16 safety gap recovery
2:15 [Tab 2 -> Tab 3: Studio Arkiv -> Rabdi Explorer] 
      └── 10m native TTL, live entity attributes, storage self-pruning
3:00 [Tab 4 -> Tab 1: Consumer App -> Section 06 Citations] 
      └── 8/8 E2E test suites on port 3001, scientific citations, close
3:45 [End Video]
```
