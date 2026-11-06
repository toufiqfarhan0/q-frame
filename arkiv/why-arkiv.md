# Why Arkiv: Post-Quantum Mempool Coordination

## 1. What Users Lose If This Sat in PostgreSQL or MongoDB

If Q-Frame stored ephemeral post-quantum key reservations in a centralized database (such as PostgreSQL, Redis, or Supabase), users and validators would immediately lose core Web3 guarantees:

1. **Censorship Vulnerability & Single Point of Failure:**
   * A centralized database server can be blocked, DDoS'd, or seized. If the Postgres server goes offline, a user opening their wallet on mobile cannot ascertain whether Leaf #3 is pending in the mempool or safe to sign. If they guess incorrectly, **they sign twice with the same OTS leaf and their private key is mathematically exposed**.
   * On Arkiv, the journal is replicated across independent consensus nodes on the Rabdi DB-Chain. No single entity can withhold the state of unmined OTS leaves.

2. **Cryptographic Provenance of Key Reservations:**
   * In Postgres, a malicious cloud admin, compromised API key, or corrupted database trigger could forge, wipe, or overwrite reservation timestamps.
   * On Arkiv, every entity creation is signed by the wallet's private key (`addr(wallet)`) and verified by EVM consensus. A reservation cannot be fabricated by third parties.

3. **Autonomous Time-To-Live (No Fragile Cron Infrastructure):**
   * Implementing auto-expiration in PostgreSQL requires maintaining external workers (e.g. `pg_cron`, Celery, Redis TTL monitors, or AWS Lambda event bridges). If that worker crashes, abandoned reservations stay locked indefinitely.
   * Arkiv enforces entity expiration natively at the consensus layer (`ExpirationTime.fromMinutes(10)`). When block height exceeds `$expiresAt`, Arkiv prunes the record deterministically.

---

## 2. What Users Can Do With Arkiv That They Cannot Do Today

1. **Multi-Device Post-Quantum Safety Without Server Accounts:**
   * Today, users either run single-device wallets (unsafe if lost) or rely on centralized wallet providers (Privy, Web3Auth) that store key state in SaaS clouds.
   * With Arkiv, any client (CLI bot, desktop browser, mobile phone) can read the user's active reservations directly from Arkiv Rabdi RPC without registering an account, providing an email, or trusting a central company.

2. **Decentralized Relayer Coordination for ERC-8421 Mempools:**
   * Alternative mempool relayers can query Arkiv to verify that an incoming frame transaction's keyed nonce is backed by a committed reservation and hasn't been superseded by a safe fee-bump on another node.

---

## 3. What We Kept Off Arkiv (And Why)

1. **Private Hash-Tree Preimages & Seed Secrets:**
   * Arkiv is a public DB-chain. Storing secret preimages or private signing keys would immediately compromise user security. All private keys stay strictly client-side on the user's hardware device.
2. **Permanent Historical Signature Archives:**
   * Once a transaction is included on Hegotá Devnet (Block #1317596), the mined sequence on `NonceManager` (0x...8250) is permanently recorded in L1 state. The ephemeral mempool reservation has served its purpose and is intentionally allowed to expire on Arkiv, preventing state bloat.

