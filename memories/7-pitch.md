# FreeFi Pitch Script (2 Minutes)

---

## Opening (15 seconds)

"Hi, I'm [Name] and we built **FreeFi** - the first truly gasless, omnichain savings protocol. We're solving DeFi's biggest UX problem: users pay $10-20 in gas fees just to move and manage their stablecoins across chains. With FreeFi, you deposit once from any chain, and everything else - bridging, rebalancing, withdrawals - costs zero gas."

---

## The Problem (20 seconds)

"Right now, if you want the best yield on your USDC, you need to:
- Monitor rates across 5+ chains
- Pay gas on each chain to bridge
- Pay more gas to deposit
- Pay even more gas to withdraw and rebalance

This isn't just expensive - it's broken. Most users give up and accept lower yields on a single chain."

---

## Our Solution (25 seconds)

"FreeFi changes this completely. Here's the user experience:

**One:** You deposit USDC from Arbitrum, Base, or Ethereum - just one transaction.

**Two:** Our protocol automatically bridges to Sepolia using LayerZero's OFT standard and deposits into our vault - you pay nothing for this.

**Three:** Our executor bot continuously monitors yield across Compound, Morpho, and Aave, and rebalances your funds to the highest rate - again, zero gas for you.

**Four:** When you want to withdraw, you just sign a message. No gas. Done."

---

## LayerZero Integration (30 seconds)

"Let me highlight how we're using **LayerZero**:

We implemented a custom OFT contract called YieldFlowOFTEVVM that does three critical things:

**First**, it enables true omnichain deposits. Users can deposit from any chain, and we have a single unified liquidity pool - no fragmentation.

**Second**, we override the `_lzReceive` function to automatically deposit funds into the vault the moment they arrive on Sepolia. There's no second transaction needed - it's all atomic.

**Third**, we built a gasless withdraw-and-bridge function that lets users exit from the vault and receive funds on their origin chain in one signature.

This is what makes FreeFi truly omnichain - LayerZero handles all the cross-chain complexity, and users just see one simple interface."

---

## EVVM Integration (30 seconds)

"Now for the gasless magic with **EVVM**:

Our VaultEVVM contract integrates with the MATE Metaprotocol to enable completely gasless operations. Here's how:

**First**, users can deposit and withdraw using `depositGasless` and `withdrawGasless` functions. They just sign an EIP-712 message, and our executor pays the gas.

**Second**, we use EVVM's async nonce system for replay protection. This is critical because we're accepting user signatures and executing them later.

**Third**, our automated rebalancing executor runs on EVVM. It monitors yield rates every 5 minutes and moves funds to optimal protocols - all without users paying a single wei in gas.

This is game-changing. Users literally don't need ETH in their wallet after the initial deposit. That's a Web2-level experience in DeFi."

---

## Technical Demo (15 seconds - if showing screen)

"Let me show you quickly: [Open app]

Connect wallet, deposit 1000 USDC from Arbitrum, and... done. LayerZero is bridging it now. When it arrives on Sepolia, it auto-deposits. Now look - I can withdraw gaslessly with just a signature. No gas prompt. Zero cost."

---

## Why This Matters (15 seconds)

"This is the first protocol that combines LayerZero's omnichain infrastructure with EVVM's gasless execution layer. Together, they solve DeFi's two biggest barriers: chain fragmentation and transaction costs.

For **LayerZero**, we're showcasing how OFT composability enables entirely new product categories - not just bridges, but protocols that feel natively omnichain.

For **EVVM**, we're the first real-world yield protocol using MATE's gasless execution. We're proving that sponsored transactions can work at scale."

---

## Closing (10 seconds)

"FreeFi makes DeFi savings as simple as opening a bank account. Deposit once, earn the best rates automatically, withdraw anytime - all gaslessly.

We're live on testnet now, and ready to deploy to mainnet. Thank you!"

---

## Backup Q&A Responses

**Q: "How do you pay for the executor gas?"**
A: "We charge a 0.5% annual management fee and 10% performance fee on yield. This covers executor operations and creates sustainable economics. As TVL grows, executor costs become negligible percentage-wise."

**Q: "What if LayerZero messages fail?"**
A: "We have safety mechanisms. If the auto-deposit fails in `_lzReceive`, funds stay as OFT tokens in the user's wallet. They can manually deposit or bridge back. Nothing is lost."

**Q: "Why not just use account abstraction?"**
A: "We actually considered it, but EVVM's async nonce system is specifically designed for DeFi protocols. It's more gas-efficient than full AA, and integrates perfectly with LayerZero's cross-chain messages."

**Q: "What chains are you targeting for mainnet?"**
A: "Launch on Arbitrum, Base, and Ethereum as source chains, with Sepolia as the EVVM-enabled destination. Then expand to Polygon, Optimism, and any chain LayerZero supports."

---

**Key Points to Emphasize:**
- ✅ First protocol combining LayerZero + EVVM
- ✅ True $0 gas after initial deposit
- ✅ Custom OFT implementation with auto-deposit
- ✅ Gasless withdrawals via EVVM signatures
- ✅ Automated yield optimization
- ✅ Web2 UX in DeFi

**Time: ~2 minutes**
