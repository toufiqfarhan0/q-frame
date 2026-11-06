`# Checkpoint 1A: Post-Quantum Gas Calibration and Bounds

## Scope & Target Bounds
This checkpoint documents the computational profile and gas consumption of `PQBenchmarkAccount.sol` under Solidity `0.8.28` (`via_ir = true`, `evm_version = "cancun"`).

The theoretical benchmark targets the NIST FIPS 205 (SLH-DSA / SPHINCS+) computational envelope measured by Nethermind (~276,000 gas).

## Measured Results

| Configuration | Iteration Profile | Gas Used | Canonical Status (<= 100k) | Staked Alt-Mempool Status (<= 2M) |
|---|---|---|---|---|
| Clean Frame | 0 chains (empty payload) | 22,736 gas | ✅ Admitted | ✅ Admitted |
| Minimal Bound | 5 chains x 10 iterations | 66,757 gas | ✅ Admitted | ✅ Admitted |
| **PQ Target (FIPS 205)** | **15 chains x 20 iterations** | **259,247 gas** | ❌ **Rejected** (`BudgetExceeded`) | ✅ **Admitted** (Staked Entity) |
| High-Security SPHINCS+ | 20 chains x 30 iterations | 481,247 gas | ❌ Rejected | ✅ **Admitted** |
| Deep SPHINCS+ Trees | 30 chains x 50 iterations | 1,147,247 gas | ❌ Rejected | ✅ **Admitted** (Unlocked by 2M Cap) |
| Peak 2M Bound | 35 chains x 75 iterations | 1,980,247 gas | ❌ Rejected | ✅ **Admitted** (Within 2M Cap) |

## Interpretation
1. At 259,247 gas, the post-quantum workload is mathematically impossible to process through the canonical public mempool, which rejects any verification exceeding 100,000 gas.
2. The ERC-8421 Alternative Mempool sidecar safely admits this transaction when the sending account holds on-chain stake (`>= 0.012 ETH`), demonstrating the necessity of the reputation/stake architecture for quantum-resistant account abstraction.

