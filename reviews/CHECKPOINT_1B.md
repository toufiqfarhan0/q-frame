# Checkpoint 1B: Entity Staking & Admission Mechanics under ERC-8421

## Mechanism Overview
Under EIP-8141, the canonical public mempool restricts transaction validation to $100,000$ gas to shield P2P consensus participants from uncompensated computational denial-of-service.

ERC-8421 defines an alternative mempool tier where sending entities lock collateral into the `NaiveStakingRegistry` (`0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`).

## The 3-Door Admission Protocol

```
                     [ TYPE 0x06 TX (Verify Gas: 259,247) ]
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      [ CANONICAL MEMPOOL ]                      [ ALT-MEMPOOL SIDECAR ]
      https://altmempool.forshtat.com            https://altmempool.forshtat.com/rpc
                   |                                       |
                   v                                       v
         [ SHOT 1: REJECTED ]                    [ SENDER STAKE CHECK ]
         BudgetExceeded: 259k > 100k                       |
                                             +-------------+-------------+
                                             |                           |
                                             v                           v
                                     [ Unstaked Sender ]         [ Staked Sender ]
                                     Stake = 0 ETH               Stake >= 0.012 ETH
                                             |                           |
                                             v                           v
                                    [ SHOT 2: REJECTED ]        [ SHOT 3: ADMITTED ]
                                    EntityUnstaked: cap 100k    Budget: 1,000,000 gas
                                                                Mined on Explorer!
```

## Formal Parameter Specifications
- **Target Verification Gas**: 259,247 gas
- **Canonical Cap**: 100,000 gas
- **Alt-Mempool Unstaked Cap**: 100,000 gas
- **Alt-Mempool Staked Cap**: 1,000,000 gas
- **Minimum Required Stake**: 0.012 ETH
- **Minimum Unstake Delay**: 86,400 seconds (1 day)
- **Staking Registry Address**: `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`
- **Mempool EntryPoint Address**: `0x00000000000000000000000000000000000000aa`

