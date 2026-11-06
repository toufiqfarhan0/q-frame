`# Checkpoint 1A: Post-Quantum Gas Calibration and Bounds

## Scope & Target Bounds
This checkpoint documents the computational profile and gas consumption of `PQBenchmarkAccount.sol` under Solidity `0.8.28` (`via_ir = true`, `evm_version = "cancun"`).

The theoretical benchmark targets the NIST FIPS 205 (SLH-DSA / SPHINCS+) computational envelope measured by Nethermind (~276,000 gas).

## Measured Results

| Configuration | Iteration Profile | Gas Used | Canonical Status (<= 100k) | Staked Alt-Mempool Status (<= 1M) |
|---|---|---|---|---|
| Clean Frame | 0 chains (empty payload) | 22,736 gas | ✅ Admitted | ✅ Admitted |
| Minimal Bound | 5 chains x 10 iterations | 66,757 gas | ✅ Admitted | ✅ Admitted |
| **PQ Target (FIPS 205)** | **15 chains x 20 iterations** | **259,247 gas** | ❌ **Rejected** (`BudgetExceeded`) | ✅ **Admitted** (Staked Entity) |
| Upper Bound | 32 chains x 80 iterations | 2,027,983 gas | ❌ Rejected | ❌ Rejected (Exceeds 1M cap) |

## Interpretation
1. At 259,247 gas, the post-quantum workload is mathematically impossible to process through the canonical public mempool, which rejects any verification exceeding 100,000 gas.
2. The ERC-8421 Alternative Mempool sidecar safely admits this transaction when the sending account holds on-chain stake (`>= 0.012 ETH`), demonstrating the necessity of the reputation/stake architecture for quantum-resistant account abstraction.

