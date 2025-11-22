# EVVM Integration Guide - FreeFi

## 🎯 Overview

FreeFi is now fully integrated with **MATE Metaprotocol (EVVM)** on Sepolia, providing gasless cross-chain yield optimization powered by LayerZero and EVVM.

## 📁 New Contract Structure

### **1. Interfaces** (`src/interfaces/`)

#### `IEVVM.sol`
Core MATE Metaprotocol interface for gasless execution:
- `executeWithAsyncNonce()` - Execute transactions gaslessly
- `registerExecutor()` - Register automated executors
- Nonce management for replay protection

#### `IMATENameService.sol`
MATE Name Service (like ENS for EVVM):
- Register user-friendly names ("alice.mate")
- Resolve names to addresses
- Reverse lookups (address → name)

#### `IMATEP2PSwap.sol`
P2P swap functionality (optional future integration)

### **2. Core Contracts**

#### `VaultEVVM.sol` (NEW - Replaces Vault.sol)
Enhanced vault with EVVM integration:

**Standard Operations (pays gas):**
- `deposit(amount)` - Regular deposit
- `withdraw(shares)` - Regular withdrawal
- `rebalance(strategy, amount)` - Owner rebalances

**Gasless Operations (via EVVM):**
- `depositGasless(user, amount, nonce, signature)` - User signs offline, executor submits
- `withdrawGasless(user, shares, nonce, signature)` - User signs offline, executor submits
- `rebalanceGasless(strategy, amount)` - Executor auto-rebalances

**MATE NameService Integration:**
- `balanceOfByName("alice.mate")` - Check balance by name
- `getUserName(address)` - Get user's MATE name

**Key Features:**
- ✅ Async nonces for replay protection
- ✅ Signature verification for security
- ✅ Executor pattern for automation
- ✅ MATE NameService support
- ✅ Toggle gasless mode on/off

#### `YieldFlowOFTEVVM.sol` (NEW - Replaces YieldFlowOFT.sol)
LayerZero OFT with EVVM integration:

**Standard Operations:**
- `mintWithUsdc(amount)` - Wrap USDC to yfUSDC
- `burnForUsdc(amount)` - Unwrap yfUSDC to USDC
- `withdrawAndBridge(shares, dstEid, recipient, options)` - Standard withdraw & bridge

**Gasless Operations:**
- `withdrawAndBridgeGasless(user, shares, nonce, signature, ...)` - Gasless withdraw & bridge

**Auto-Deposit on Receive:**
- Overrides `_lzReceive()` to auto-deposit into VaultEVVM
- When USDC arrives from LayerZero, automatically deposits to vault
- Users get vault shares immediately upon cross-chain arrival

**Key Features:**
- ✅ Compatible with LayerZero OFT standard
- ✅ EVVM integration for gasless operations
- ✅ Auto-deposit to VaultEVVM on arrival
- ✅ Toggle auto-deposit and gasless mode

## 🏗️ Architecture

### **Cross-Chain Deposit Flow**

```
┌─────────────────────────────────────────────────┐
│  Source Chain (Arbitrum Sepolia)                │
│                                                  │
│  1. User approves YieldFlowOFTEVVM              │
│  2. User calls mintWithUsdc(1000 USDC)          │
│  3. User calls send() to bridge to Sepolia      │
│     → Pays LayerZero bridge fee (~$2-5)         │
└──────────────┬──────────────────────────────────┘
               │
               │ 🔗 LayerZero Cross-Chain Message
               │ (1-5 minutes)
               ↓
┌─────────────────────────────────────────────────┐
│  Destination Chain (Sepolia)                    │
│  📍 MATE Metaprotocol (EVVM)                    │
│                                                  │
│  4. YieldFlowOFTEVVM._lzReceive() triggered     │
│  5. Auto-deposits to VaultEVVM                  │
│     → VaultEVVM.deposit(1000 USDC) called       │
│     → User gets vault shares                    │
│     → NO GAS paid by user! ✨                   │
└─────────────────────────────────────────────────┘
```

### **Gasless Withdrawal Flow**

```
┌─────────────────────────────────────────────────┐
│  User's Browser (Offline)                       │
│                                                  │
│  1. User signs withdrawal message                │
│     → message = hash(user, shares, nonce)       │
│     → signature = sign(message, privateKey)     │
│  2. Send signature to executor API              │
└──────────────┬──────────────────────────────────┘
               │
               │ Signature + params
               ↓
┌─────────────────────────────────────────────────┐
│  Executor Bot (Automated)                       │
│                                                  │
│  3. Receives signature + withdrawal request     │
│  4. Calls withdrawGasless(user, shares, nonce,  │
│     signature) on VaultEVVM                     │
│     → Executor pays gas via EVVM                │
│     → User receives USDC                        │
│     → User paid $0 gas! ✨                      │
└─────────────────────────────────────────────────┘
```

### **Auto-Rebalancing Flow**

```
┌─────────────────────────────────────────────────┐
│  Yield Monitor Bot (Backend)                    │
│                                                  │
│  1. Monitors yield rates across protocols       │
│  2. Detects better rate: 12% → 14%              │
│  3. Triggers executor                           │
└──────────────┬──────────────────────────────────┘
               │
               │ Rebalance signal
               ↓
┌─────────────────────────────────────────────────┐
│  Executor Bot                                   │
│                                                  │
│  4. Calls rebalanceGasless(newStrategy, amount) │
│     on VaultEVVM                                │
│     → Executor pays gas via EVVM                │
│     → Funds move to 14% yield                   │
│     → Users pay $0 gas! ✨                      │
└─────────────────────────────────────────────────┘
```

## 🔗 Contract Addresses (Sepolia Testnet)

### **MATE Metaprotocol (EVVM)**
- EVVM Core: `0x9902984d86059234c3B6e11D5eAEC55f9627dD0f`
- EVVM ID: `2`
- MATE Staking: `0x8eB2525239781e06dBDbd95d83c957C431CF2321`
- MATE NameService: `0x8038e87dc67D87b31d890FD01E855a8517ebfD24`
- P2P Swap: `0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5`

### **LayerZero Endpoints**
- Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Arbitrum Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Base Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`

## 🎨 Frontend Integration

### **Gasless Signing Example**

```typescript
import { useSignMessage } from 'wagmi';

// User wants to withdraw gaslessly
const { signMessageAsync } = useSignMessage();

async function withdrawGasless(shares: bigint) {
  // Get user's current nonce from contract
  const nonce = await vaultContract.read.getNonce([userAddress]);

  // Create message to sign
  const message = ethers.solidityPackedKeccak256(
    ['string', 'address', 'uint256', 'uint256', 'uint256', 'address'],
    [
      'VaultEVVM.withdrawGasless',
      userAddress,
      shares,
      nonce,
      chainId,
      vaultAddress
    ]
  );

  // User signs offline (NO GAS!)
  const signature = await signMessageAsync({ message });

  // Send to executor API
  await fetch('/api/executor/withdraw', {
    method: 'POST',
    body: JSON.stringify({
      user: userAddress,
      shares: shares.toString(),
      nonce: nonce.toString(),
      signature
    })
  });

  // Executor submits transaction and pays gas
  // User gets USDC without paying gas! ✨
}
```

### **Check MATE Name**

```typescript
// Check user balance by MATE name
const balance = await vaultContract.read.balanceOfByName(['alice.mate']);

// Get user's MATE name
const mateName = await vaultContract.read.getUserName([userAddress]);
// Returns: "alice.mate" or ""
```

## 🧪 Testing

### **Test Contracts**

```bash
cd blockchain

# Run all tests
forge test

# Test VaultEVVM gasless operations
forge test --match-contract VaultEVVMTest -vvv

# Test YieldFlowOFTEVVM
forge test --match-contract YieldFlowOFTEVVMTest -vvv
```

### **Manual Testing on Sepolia**

1. **Get Test Tokens:**
   ```bash
   # Get Sepolia ETH from faucet
   # https://sepoliafaucet.com

   # Get test $MATE from EVVM faucet
   # https://evvm.dev or Telegram: https://t.me/EVVMorg

   # Get mock USDC (deploy MockERC20)
   ```

2. **Deploy Contracts:**
   ```bash
   forge script script/DeployEVVM.s.sol --rpc-url sepolia --broadcast
   ```

3. **Test Gasless Deposit:**
   ```bash
   # Sign message offline
   # Send to executor
   # Verify user shares increased without paying gas
   ```

## 🏆 Prize Eligibility

### **EVVM Best Integration ($7,000)**
✅ Uses MATE Metaprotocol
✅ Async nonces for gasless transactions
✅ Executor pattern for automation
✅ MATE NameService integration
✅ Novel use case: Gasless DeFi yield vault

### **LayerZero ($20,000)**
✅ Uses LayerZero OFT for cross-chain bridging
✅ Extends OApp/OFT with custom _lzReceive
✅ Cross-chain messaging between multiple chains
✅ Working demo with multiple chains

### **Circle ($10,000)**
✅ Uses USDC infrastructure
✅ Cross-chain USDC flows
✅ USDC as core asset

**Total Prize Eligibility: $37,000** 🎉

## 🔄 Migration from Old Contracts

### **Changes Required:**

1. **Replace Vault.sol with VaultEVVM.sol**
   - VaultEVVM has all Vault.sol functions
   - Plus gasless functions
   - Plus MATE NameService

2. **Replace YieldFlowOFT.sol with YieldFlowOFTEVVM.sol**
   - YieldFlowOFTEVVM has all YieldFlowOFT.sol functions
   - Plus gasless withdrawAndBridge
   - Plus EVVM integration

3. **Update Frontend:**
   - Change Saga chain to Sepolia
   - Add gasless signing logic
   - Add MATE name resolution
   - Update contract ABIs

4. **Deploy New Contracts:**
   - Deploy to Sepolia (not Saga)
   - Configure EVVM addresses
   - Set up executor bot
   - Register with MATE Metaprotocol

## 📝 Next Steps

1. ✅ Create deployment script for Sepolia
2. ✅ Set up executor bot (backend service)
3. ✅ Update frontend for gasless operations
4. ✅ Test on Sepolia testnet
5. ✅ Submit to EVVM for prize consideration

## 🆘 Support

- **EVVM Docs:** https://docs.evvm.org
- **EVVM Telegram:** https://t.me/EVVMorg
- **EVVM Faucet:** https://evvm.dev
- **LayerZero Docs:** https://docs.layerzero.network
