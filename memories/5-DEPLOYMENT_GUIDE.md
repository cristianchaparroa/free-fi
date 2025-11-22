# FreeFi Deployment Guide

## 📋 Prerequisites

1. **Foundry** installed: https://book.getfoundry.sh/getting-started/installation
2. **Private key** with Sepolia ETH
3. **Etherscan API key** for verification
4. **Test MATE tokens** from EVVM faucet (optional)

## 🔑 Environment Variables

Create a `.env` file in the `blockchain` directory:

```bash
# Required
PRIVATE_KEY=0x...                           # Your deployer private key
ETHERSCAN_API_KEY=...                       # For contract verification

# Optional
USE_MOCK_USDC=true                          # Deploy mock USDC (default: true)
USDC_ADDRESS=0x...                          # Real USDC address (if not using mock)
FEE_COLLECTOR=0x...                         # Fee collector (default: deployer)
EXECUTOR=0x...                              # Executor bot address (default: deployer)

# For peer configuration
OFT_ADDRESS=0x...                           # YieldFlowOFTEVVM on current chain
PEER_OFT_SEPOLIA=0x...                      # YieldFlowOFTEVVM on Sepolia
PEER_OFT_ARBITRUM=0x...                     # YieldFlowOFTEVVM on Arbitrum Sepolia
PEER_OFT_BASE=0x...                         # YieldFlowOFTEVVM on Base Sepolia
```

## 🚀 Deployment Options

### Option 1: Deploy Everything (Recommended)

Deploy VaultEVVM + YieldFlowOFTEVVM on Sepolia in one command:

```bash
cd blockchain

# Load environment variables
source .env

# Deploy everything on Sepolia
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**This will:**
- Deploy Mock USDC (or use real USDC)
- Deploy VaultEVVM with EVVM integration
- Deploy YieldFlowOFTEVVM
- Configure VaultEVVM (set executor, enable gasless)
- Configure YieldFlowOFTEVVM (enable auto-deposit)
- Save deployment info to `deployments/sepolia-complete.json`

---

### Option 2: Deploy Step-by-Step

#### Step 2.1: Deploy VaultEVVM Only

```bash
forge script script/DeployVaultEVVM.s.sol:DeployVaultEVVM \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**Output:** `deployments/vault-evvm.json`

#### Step 2.2: Deploy YieldFlowOFTEVVM on Sepolia

```bash
# Set vault address from previous deployment
export VAULT_ADDRESS=0x...

forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**Output:** `deployments/oft-sepolia.json`

#### Step 2.3: Deploy YieldFlowOFTEVVM on Source Chains

**Arbitrum Sepolia:**
```bash
forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
  --rpc-url arbitrum-sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**Base Sepolia:**
```bash
forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
  --rpc-url base-sepolia \
  --broadcast \
  --verify \
  -vvvv
```

---

### Option 3: Configure LayerZero Peers

After deploying OFTs on multiple chains, connect them:

#### Configure from Sepolia (connect to source chains):

```bash
export OFT_ADDRESS=0x...              # Sepolia OFT
export PEER_OFT_ARBITRUM=0x...        # Arbitrum OFT
export PEER_OFT_BASE=0x...            # Base OFT

forge script script/ConfigurePeers.s.sol:ConfigurePeers \
  --rpc-url sepolia \
  --broadcast \
  -vvvv
```

#### Configure from Arbitrum (connect to Sepolia):

```bash
export OFT_ADDRESS=0x...              # Arbitrum OFT
export PEER_OFT_SEPOLIA=0x...         # Sepolia OFT

forge script script/ConfigurePeers.s.sol:ConfigurePeers \
  --rpc-url arbitrum-sepolia \
  --broadcast \
  -vvvv
```

#### Configure from Base (connect to Sepolia):

```bash
export OFT_ADDRESS=0x...              # Base OFT
export PEER_OFT_SEPOLIA=0x...         # Sepolia OFT

forge script script/ConfigurePeers.s.sol:ConfigurePeers \
  --rpc-url base-sepolia \
  --broadcast \
  -vvvv
```

---

## 📝 Post-Deployment Checklist

### 1. Verify Contracts

All contracts should be auto-verified, but if not:

```bash
# VaultEVVM
forge verify-contract <VAULT_ADDRESS> VaultEVVM \
  --chain sepolia \
  --watch \
  --constructor-args $(cast abi-encode 'constructor(address,address,address,address)' <USDC> <FEE_COLLECTOR> <EVVM> <NAME_SERVICE>)

# YieldFlowOFTEVVM
forge verify-contract <OFT_ADDRESS> YieldFlowOFTEVVM \
  --chain sepolia \
  --watch \
  --constructor-args $(cast abi-encode 'constructor(address,address,address,address,address)' <USDC> <VAULT> <LZ_ENDPOINT> <EVVM> <OWNER>)
```

### 2. Configure VaultEVVM

```bash
# Set executor (if not done in DeployAll)
cast send <VAULT_ADDRESS> "setExecutor(address)" <EXECUTOR_ADDRESS> \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY

# Enable gasless mode
cast send <VAULT_ADDRESS> "setGaslessMode(bool)" true \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY

# Add yield strategies (optional)
cast send <VAULT_ADDRESS> "addStrategy(address)" <STRATEGY_ADDRESS> \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY
```

### 3. Configure YieldFlowOFTEVVM

```bash
# Enable gasless mode (after executor is ready)
cast send <OFT_ADDRESS> "setGaslessMode(bool)" true \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY

# Verify auto-deposit is enabled
cast call <OFT_ADDRESS> "isAutoDepositEnabled()(bool)" \
  --rpc-url sepolia
```

### 4. Test Cross-Chain Flow

```bash
# On Arbitrum Sepolia, mint USDC and bridge to Sepolia
cast send <USDC_ADDRESS> "mint(address,uint256)" <YOUR_ADDRESS> 1000000000 \
  --rpc-url arbitrum-sepolia \
  --private-key $PRIVATE_KEY

cast send <USDC_ADDRESS> "approve(address,uint256)" <OFT_ADDRESS> 1000000000 \
  --rpc-url arbitrum-sepolia \
  --private-key $PRIVATE_KEY

cast send <OFT_ADDRESS> "mintWithUsdc(uint256)" 1000000000 \
  --rpc-url arbitrum-sepolia \
  --private-key $PRIVATE_KEY

# Send to Sepolia (get quote first)
cast call <OFT_ADDRESS> "quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool)" \
  "(40161,<RECIPIENT_BYTES32>,1000000000,990000000,0x,0x,0x),false" \
  --rpc-url arbitrum-sepolia
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
forge test

# VaultEVVM tests
forge test --match-contract VaultEVVM -vvv

# YieldFlowOFTEVVM tests
forge test --match-contract YieldFlowOFTEVVM -vvv

# Integration tests
forge test --match-test testCrossChain -vvv
```

### Fork Testing

```bash
# Test on Sepolia fork
forge test --fork-url https://rpc.sepolia.org -vvv
```

---

## 📊 Deployment Info

After deployment, check these files:

```
deployments/
├── sepolia-complete.json       # Complete deployment (Option 1)
├── vault-evvm.json             # VaultEVVM only (Option 2)
├── oft-sepolia.json            # OFT on Sepolia
├── oft-arbitrum-sepolia.json   # OFT on Arbitrum
└── oft-base-sepolia.json       # OFT on Base
```

---

## 🆘 Troubleshooting

### Error: "EVVM not available on this chain"
- **Solution:** Deploy on Sepolia. MATE Metaprotocol only runs on Sepolia testnet.

### Error: "VAULT_ADDRESS not set"
- **Solution:** Deploy VaultEVVM first, then set `export VAULT_ADDRESS=0x...`

### Error: "Peer not set"
- **Solution:** Run `ConfigurePeers.s.sol` after deploying OFTs on all chains

### LayerZero message not arriving
- **Solution:** Check LayerZero scan: https://testnet.layerzeroscan.com
- Verify peers are configured correctly
- Ensure sufficient gas sent for cross-chain tx

---

## 🎯 Next Steps

1. ✅ Deploy contracts (done)
2. ✅ Configure LayerZero peers
3. 🔄 Set up executor bot (backend service)
4. 🔄 Update frontend with new contract addresses
5. 🔄 Test cross-chain deposits
6. 🔄 Test gasless operations
7. 🔄 Submit to EVVM for prize consideration

---

## 📚 Resources

- **EVVM Docs:** https://docs.evvm.org
- **EVVM Telegram:** https://t.me/EVVMorg
- **LayerZero Docs:** https://docs.layerzero.network
- **Sepolia Faucet:** https://sepoliafaucet.com
- **MATE Faucet:** https://evvm.dev

---

## 🏆 Prize Submission

After deployment and testing:

1. **Document your integration:**
   - Architecture diagrams
   - Contract addresses
   - Demo video

2. **Submit to EVVM:**
   - Fill out submission form
   - Include GitHub repo
   - Show gasless operations

3. **Tag sponsors:**
   - Twitter: @EVVMorg @LayerZero_Core @Circle
