# FreeFi Deployment Automation Script

## Overview

The `deploy-full.sh` script automates the complete deployment of the FreeFi protocol across multiple chains, including:

1. **Sepolia** (Destination Chain with EVVM)
   - Mock USDC
   - VaultEVVM (with gasless operations)
   - YieldFlowOFTEVVM

2. **Arbitrum Sepolia** (Source Chain)
   - Mock USDC
   - YieldFlowOFTEVVM

3. **Base Sepolia** (Optional Source Chain)
   - Mock USDC
   - YieldFlowOFTEVVM

4. **LayerZero Peer Configuration**
   - Bidirectional peer setup between all deployed chains

## Prerequisites

1. **Foundry** installed and updated
2. **Environment Variables** set in `.env`:
   ```bash
   PRIVATE_KEY=0x...
   ETHERSCAN_API_KEY=...
   USE_MOCK_USDC=true
   ```
3. **Testnet ETH** on all chains you want to deploy to:
   - Sepolia ETH (for Sepolia)
   - Arbitrum Sepolia ETH (for Arbitrum)
   - Base Sepolia ETH (for Base - optional)

## Quick Start

### Full Deployment (Sepolia + Arbitrum)

Deploy everything with one command:

```bash
./deploy-full.sh
```

This will:
- ✅ Deploy all contracts on Sepolia
- ✅ Deploy OFT on Arbitrum Sepolia
- ✅ Configure LayerZero peers bidirectionally
- ✅ Verify all contracts on Etherscan/Arbiscan

### Custom Deployment Options

#### Deploy without Base Sepolia (default)

```bash
./deploy-full.sh
```

#### Deploy including Base Sepolia

```bash
./deploy-full.sh --deploy-base
```

#### Deploy only Sepolia (skip Arbitrum)

```bash
./deploy-full.sh --skip-arbitrum
```

#### Deploy only Arbitrum (skip Sepolia)

```bash
./deploy-full.sh --skip-sepolia
```

#### Skip contract verification (faster)

```bash
./deploy-full.sh --skip-verify
```

#### Deploy without configuring peers

```bash
./deploy-full.sh --skip-peers
```

#### Combine multiple options

```bash
./deploy-full.sh --deploy-base --skip-verify
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--skip-sepolia` | Skip Sepolia deployment |
| `--skip-arbitrum` | Skip Arbitrum Sepolia deployment |
| `--deploy-base` | Deploy on Base Sepolia (off by default) |
| `--skip-verify` | Skip contract verification on block explorers |
| `--skip-peers` | Skip LayerZero peer configuration |
| `--help` | Show help message |

## What the Script Does

### Step 1: Deploy on Sepolia

Runs `DeployAll.s.sol` which:
- Deploys Mock USDC (10M tokens)
- Deploys VaultEVVM with EVVM integration
- Deploys YieldFlowOFTEVVM
- Configures executor and enables gasless mode
- Enables auto-deposit
- Saves deployment info to `deployments/sepolia-complete.json`

### Step 2: Deploy on Arbitrum Sepolia

Runs `DeployYieldFlowOFTEVVM.s.sol` which:
- Deploys Mock USDC (1M tokens)
- Deploys YieldFlowOFTEVVM
- Saves deployment info to `deployments/oft-arbitrum-sepolia.json`

### Step 3: Deploy on Base Sepolia (Optional)

Same as Step 2 but on Base Sepolia:
- Saves deployment info to `deployments/oft-base-sepolia.json`

### Step 4: Configure LayerZero Peers

Runs `ConfigurePeersAuto.s.sol` on each chain:
- Automatically reads deployment JSON files
- Configures bidirectional peer connections
- Enables cross-chain communication

## Output Files

After successful deployment, you'll have:

```
deployments/
├── sepolia-complete.json       # Sepolia deployment info
├── oft-arbitrum-sepolia.json   # Arbitrum deployment info
└── oft-base-sepolia.json       # Base deployment info (if deployed)
```

Each JSON file contains:
- Chain ID
- Contract addresses (USDC, OFT, Vault)
- LayerZero endpoint and EID
- EVVM addresses (Sepolia only)

## Deployment Summary Example

After completion, the script displays:

```
Sepolia (Destination Chain):
  - MockERC20 (USDC): 0x4472F2eBebc35ddAf4a49B4ACa6592a2D5389D08
  - VaultEVVM: 0xE807926564896eD31B58C9F2B8d47b3Dee65D17E
  - YieldFlowOFTEVVM: 0xad610f512EE14Fd6C22d2447228eCd354F036793
  - Etherscan: https://sepolia.etherscan.io/address/0xad610f512EE14Fd6C22d2447228eCd354F036793

Arbitrum Sepolia (Source Chain):
  - MockERC20 (USDC): 0x4472F2eBebc35ddAf4a49B4ACa6592a2D5389D08
  - YieldFlowOFTEVVM: 0xE807926564896eD31B58C9F2B8d47b3Dee65D17E
  - Arbiscan: https://sepolia.arbiscan.io/address/0xE807926564896eD31B58C9F2B8d47b3Dee65D17E
```

## Troubleshooting

### Error: "Insufficient funds"

**Problem**: Not enough testnet ETH for gas fees

**Solution**: Get testnet ETH from faucets:
- Sepolia: https://sepoliafaucet.com
- Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
- Base Sepolia: https://faucet.quicknode.com/base/sepolia

### Error: "PRIVATE_KEY not set"

**Problem**: `.env` file missing or `PRIVATE_KEY` not configured

**Solution**: Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your private key
```

### Error: "RPC endpoint error"

**Problem**: RPC endpoint down or rate limited

**Solution**: The script uses public RPC endpoints. Wait a moment and retry.

### Error: "Peer configuration failed"

**Problem**: Contracts not deployed or addresses not in JSON files

**Solution**:
1. Check that deployments completed successfully
2. Verify JSON files exist in `deployments/` directory
3. Run peer configuration manually if needed

## Manual Peer Configuration

If peer configuration fails, you can run it manually:

```bash
# From Arbitrum to Sepolia
forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto \
  --rpc-url arbitrum-sepolia \
  --broadcast \
  -vvv

# From Sepolia to Arbitrum
forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto \
  --rpc-url sepolia \
  --broadcast \
  -vvv
```

## Estimated Costs

| Chain | Gas Cost (ETH) | USD Estimate |
|-------|---------------|--------------|
| Sepolia | ~0.000007 ETH | $0.02 |
| Arbitrum Sepolia | ~0.00008 ETH | $0.25 |
| Base Sepolia | ~0.00008 ETH | $0.25 |
| Peer Config (each) | ~0.000001 ETH | $0.003 |
| **Total (Sep + Arb)** | ~0.00009 ETH | **~$0.30** |

## Next Steps After Deployment

1. **Test Cross-Chain Bridge**
   ```bash
   # Mint USDC on Arbitrum
   cast send $ARBITRUM_USDC "mint(address,uint256)" $YOUR_ADDRESS 1000000000 \
     --rpc-url arbitrum-sepolia --private-key $PRIVATE_KEY

   # Bridge to Sepolia
   # (see DEPLOYMENT_GUIDE.md for full instructions)
   ```

2. **Update Frontend**
   - Copy contract addresses from JSON files
   - Update `frontend/src/wagmi.ts` with new addresses

3. **Test Gasless Operations**
   - Try gasless deposit on Sepolia via EVVM
   - Test signature-based withdrawals

4. **Create Demo Video**
   - Show cross-chain deposit
   - Demonstrate gasless withdrawal
   - Highlight EVVM integration

## Support

For issues or questions:
- Check `DEPLOYMENT_GUIDE.md` for detailed manual deployment steps
- Review `EVVM_INTEGRATION.md` for EVVM-specific documentation
- Check LayerZero docs: https://docs.layerzero.network

## License

MIT
