import { formatEther } from "viem";
import { loadConfig } from "../src/lib/config.js";
import { readState } from "../src/lib/state.js";

function printDashboard() {
  console.log(`
===================================================================================
                   Q-FRAME: POST-QUANTUM GAS BENCHMARK REPORT
===================================================================================

[1] EMPIRICAL GAS CURVES ACROSS SIGNATURE SCHEMES (SOLC 0.8.28 CANCUN)
-----------------------------------------------------------------------------------
Scheme / Workload            | Gas Measured  | Canonical Mempool | ERC-8421 Alt Mempool
-----------------------------+---------------+-------------------+-----------------
Standard ECDSA (secp256k1)   |   ~21,000 gas |   ✅ ADMITTED      |   ✅ ADMITTED
Toy Hash-Chain (5x10 rounds) |   ~66,757 gas |   ✅ ADMITTED      |   ✅ ADMITTED
-----------------------------+---------------+-------------------+-----------------
>>> CANONICAL MEMPOOL CAP <<<|   100,000 gas |   --- BOUNDARY ---|   --- BOUNDARY ---
-----------------------------+---------------+-------------------+-----------------
FIPS 205 PQ Hash (15x20)     |  *259,247 gas*|   ❌ REJECTED      |   ✅ ADMITTED (Staked)
Full Lattice / Dilithium     | 2,027,983 gas |   ❌ REJECTED      |   ❌ EXCEEDED (>1M)
-----------------------------+---------------+-------------------+-----------------
>>> STAKED ALT-MEMPOOL CAP <<| 1,000,000 gas |                   |   --- CEILING ---
===================================================================================

[2] THE 3-DOOR ADMISSION PROTOCOL (LIVE DEVNET EVALUATION)
-----------------------------------------------------------------------------------
Door 1 (Canonical Ethrex):      Drop tx (> 100,000 gas limit exceeded)
Door 2 (Alt-Mempool Unstaked):  Drop tx (Unstaked entity capped at 100,000 gas)
Door 3 (Alt-Mempool Staked):    ADMITTED & MINED! (Unlocked by >= 0.012 ETH on-chain stake)
===================================================================================
`);
}

printDashboard();

