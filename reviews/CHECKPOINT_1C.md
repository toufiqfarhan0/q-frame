# Checkpoint 1C: EIP-8250 Keyed Nonces for Hash-Based One-Time Signatures

## 1. Problem Statement: The OTS Fee-Bump Vulnerability

Post-quantum hash-based signature algorithms—such as Winternitz OTS+ (WOTS+), XMSS, and SPHINCS+ (NIST FIPS 205)—rely on one-time signature (OTS) key pairs. Each leaf private key consists of a sequence of secret preimages $sk = (s_1, \dots, s_w)$, and the public key consists of hashes $pk = (h(s_1), \dots, h(s_w))$.

Signing a message digest $M$ reveals intermediate hash values:
$$\sigma(M) = (h^{m_1}(s_1), \dots, h^{m_w}(s_w))$$

### The RBF Catastrophe
In standard Ethereum (linear 1D nonce sequence $0, 1, 2, \dots$):
1. A user broadcasts transaction $T_1$ with gas fee $f_1$, signed using OTS leaf key $sk_k$.
2. Network congestion requires a fee-bump (Replace-By-Fee, RBF) to $f_2 > f_1$.
3. Transaction $T_2$ has a different payload/gas pricing, hence a different message digest $M_2 \neq M_1$.
4. If $T_2$ is signed with the same leaf $sk_k$, an observer obtains both $\sigma(M_1)$ and $\sigma(M_2)$. Because hash chains are monotonic, the union of revealed hash values exposes smaller intermediate preimages, allowing an adversary to forge valid signatures for uncommitted messages.
5. If the user instead signs $T_2$ with leaf $sk_{k+1}$, a linear nonce forces nonce reuse ($N$) or queue desynchronization ($N+1$), both of which fail standard mempool replacement rules.

---

## 2. Protocol Solution: 2D Keyed Nonces (EIP-8250)

The Hegotá Ethrex Devnet natively exposes the `NONCE_MANAGER` predeploy at address `0x0000000000000000000000000000000000008250`. Nonces are structured as:
$$\text{Account Nonce} \in \mathbb{N} \times \mathbb{N} \quad \implies \quad (\text{nonceKey}, \text{sequence})$$

### The Q-Frame Mapping Invariant
Q-Frame binds the post-quantum Merkle tree leaf index directly to the EIP-8250 nonce key:
$$\text{nonceKey} := \text{leafIndex}$$

```
                +---------------------------------------+
                |    SPHINCS+ / WOTS+ Merkle Tree       |
                |  Root: 0x8272... (EIP-8272 Anchor)   |
                +---------------------------------------+
                    /          |          \          \
                 Leaf 0     Leaf 1     Leaf 2     Leaf 3
                   |          |          |          |
                   v          v          v          v
               nonceKey=0  nonceKey=1 nonceKey=2 nonceKey=3
               (seq: 0->1) (seq: 0->1)(seq: 0->1)(seq: 0->1)
```

### Mempool Concurrency & Replay Invariants

1. **Independent Replacement:** If transaction on Leaf $k$ stalls, the user can abandon Leaf $k$ and broadcast on Leaf $k+1$ without queue head-of-line blocking.
2. **Concurrent Admission:** Multiple transactions across different leaves can be held in the alternative mempool simultaneously (`step_12_tx_keyed_nonces`).
3. **On-Chain Retirement:** Once Leaf $k$ is mined, sequence advances $0 \to 1$. Any subsequent transaction referencing Leaf $k$ with sequence 0 reverts at the `NONCE_MANAGER` validation check before frame execution, preventing replay attacks at zero execution cost.
