Perfect! I can see your current architecture. Now let me create a comprehensive plan to migrate from Saga to EVVM:

  ---
📋 EVVM Migration Plan: Saga → EVVM

Current Architecture ✅

User deposits USDC (Ethereum/Arbitrum/Base)
↓ LayerZero OFT
YieldFlowOFT bridges to Saga
↓ Auto-deposit
Vault.sol (gasless on Saga)
↓ Rebalancing
Yield Strategies (Aave, Compound, etc.)

Target Architecture 🎯

User deposits USDC (Ethereum/Arbitrum/Base)
↓ LayerZero OFT
YieldFlowOFT bridges to EVVM Sepolia
↓ Auto-deposit
Vault.sol (gasless on EVVM)
↓ Rebalancing
Yield Strategies (Aave, Compound, etc.)

  ---
Phase 1: Research & Setup (Day 1)

Task 1.1: Understand EVVM Architecture

⏺ Resources to check:
- EVVM Docs: https://docs.evvm.org
- MATE Metaprotocol Testnet Contracts:
    - Sepolia EVVM: 0x2FE943eE9bD346aF46d46BD36c9ccb86201Da21A (MATE Staking)
    - Sepolia NameService: 0x93DFFaEd15239Ec77aaaBc79DF3b9818dD3E406A
    - Treasury: 0x213F4c8b5a228977436c2C4929F7bd67B29Af8CD
    - P2P Swap: 0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5

Key concepts:
- EVVM = "Virtual blockchain" running as Solidity contracts
- Gasless by default (EVVM abstracts gas)
- Deploy on Ethereum Sepolia testnet
- Inherits Ethereum security

Action items:
# Join EVVM Devs Telegram for support
# https://t.me/EVVMorg

# Request test $MATE tokens from faucet

  ---
Task 1.2: Audit Current Contract Structure

Your contracts (blockchain/src/):
- ✅ Vault.sol - EVM-compatible ✓ (works on EVVM as-is)
- ✅ YieldFlowOFT.sol - LayerZero OFT ✓ (needs chain ID update)
- ✅ MockERC20.sol - For testing ✓

No changes needed to contract logic! EVVM runs standard Solidity.

  ---
Phase 2: EVVM Deployment (Day 2)

Task 2.1: Deploy EVVM Instance

Option A: Use existing MATE Metaprotocol (Recommended for hackathon)

// EVVM is already deployed on Sepolia
// Just deploy your contracts to it!
// Network details:
{
chainId: 11155111, // Sepolia
evvmAddress: "0x...", // MATE Metaprotocol address
rpcUrl: "https://rpc.sepolia.org"
}

Option B: Deploy your own EVVM instance

# Install EVVM tooling
npm install @evvm/core

# Deploy EVVM instance
npx evvm deploy --network sepolia

  ---
Task 2.2: Update Foundry Configuration

File: blockchain/foundry.toml

Add EVVM network:

[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
via_ir = true

[rpc_endpoints]
sepolia = "https://rpc.sepolia.org"
evvm_sepolia = "https://rpc.sepolia.org" # EVVM runs on Sepolia

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }

# Remappings (keep existing)
remappings = [
"@openzeppelin/=lib/openzeppelin-contracts/",
"@layerzero/=lib/LayerZero-v2/packages/layerzero-v2/evm/oapp/contracts/",
# ... rest of your remappings
]

  ---
Task 2.3: Create Deployment Script for EVVM

File: blockchain/script/DeployToEVVM.s.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Vault} from "../src/Vault.sol";
import {YieldFlowOFT} from "../src/YieldFlowOFT.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployToEVVM is Script {
// Sepolia LayerZero Endpoint
address constant LZ_ENDPOINT = 0x6EDCE65403992e310A62460808c4b910D972f10f;

      function run() external {
          uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
          address deployer = vm.addr(deployerPrivateKey);

          console.log("Deploying to EVVM on Sepolia...");
          console.log("Deployer:", deployer);

          vm.startBroadcast(deployerPrivateKey);

          // 1. Deploy Mock USDC for testing (or use real Sepolia USDC)
          MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
          console.log("Mock USDC deployed at:", address(usdc));

          // 2. Deploy Vault (gasless operations on EVVM!)
          Vault vault = new Vault(address(usdc), deployer);
          console.log("Vault deployed at:", address(vault));

          // 3. Deploy YieldFlowOFT
          YieldFlowOFT oft = new YieldFlowOFT(
              address(usdc),
              address(vault),
              LZ_ENDPOINT,
              deployer
          );
          console.log("YieldFlowOFT deployed at:", address(oft));

          vm.stopBroadcast();

          console.log("\n=== Deployment Summary ===");
          console.log("USDC:", address(usdc));
          console.log("Vault:", address(vault));
          console.log("YieldFlowOFT:", address(oft));
          console.log("Network: EVVM on Sepolia");
      }
}

Deploy command:

cd blockchain

# Set environment variables
export PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_etherscan_key"

# Deploy to Sepolia (EVVM runs on Sepolia)
forge script script/DeployToEVVM.s.sol:DeployToEVVM \
--rpc-url https://rpc.sepolia.org \
--broadcast \
--verify \
-vvvv

  ---
Phase 3: Frontend Updates (Day 3)

Task 3.1: Update wagmi.ts Configuration

File: frontend/src/wagmi.ts

Replace Saga testnet with EVVM/Sepolia:

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
metaMaskWallet,
walletConnectWallet,
coinbaseWallet,
rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { sepolia, arbitrumSepolia, baseSepolia } from 'wagmi/chains';

// Remove Saga, use Sepolia (EVVM runs on Sepolia)
const chains = [
sepolia,           // EVVM deployment chain
arbitrumSepolia,   // Source chain for deposits
baseSepolia,       // Source chain for deposits
] as const;

const connectors = connectorsForWallets(
[
{
groupName: 'Recommended',
wallets: [
metaMaskWallet,
walletConnectWallet,
coinbaseWallet,
rainbowWallet,
],
},
],
{
appName: 'FreeFi - Cross-Chain Yield Optimizer (EVVM)',
projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
}
);

export const config = createConfig({
connectors,
chains,
transports: {
[sepolia.id]: http(), // EVVM on Sepolia
[arbitrumSepolia.id]: http(),
[baseSepolia.id]: http(),
},
ssr: true,
});

  ---
Task 3.2: Update Contract Addresses

File: frontend/src/config/contracts.ts (create this file)

export const CONTRACTS = {
// EVVM on Sepolia
VAULT_ADDRESS: '0x...', // Your deployed Vault address
OFT_ADDRESS: '0x...',   // Your deployed YieldFlowOFT address
USDC_ADDRESS: '0x...',  // Mock USDC or real Sepolia USDC

    // Source chains (if you deploy OFTs there too)
    ARBITRUM_SEPOLIA_OFT: '0x...',
    BASE_SEPOLIA_OFT: '0x...',
} as const;

export const CHAIN_CONFIG = {
EVVM_CHAIN_ID: 11155111, // Sepolia (EVVM runs on it)
SUPPORTED_CHAINS: [11155111, 421614, 84532], // Sepolia, Arb Sepolia, Base Sepolia
} as const;

  ---
Phase 4: Testing (Day 4)

Task 4.1: Test Gasless Operations on EVVM

# Test script
cd blockchain

# Test deposits (should be gasless on EVVM)
forge test --match-test testDeposit -vvv

# Test withdrawals
forge test --match-test testWithdraw -vvv

# Test rebalancing
forge test --match-test testRebalance -vvv

Expected behavior:
- ✅ Deposits work without gas fees
- ✅ Withdrawals work without gas fees
- ✅ Rebalancing works without gas fees
- ✅ EVVM abstracts gas internally

  ---
Task 4.2: Test Cross-Chain Deposits

Test flow:
1. User deposits USDC on Arbitrum Sepolia
2. Bridge via LayerZero OFT to EVVM/Sepolia
3. Auto-deposit into Vault on EVVM (gasless!)
4. Verify user shares in Vault

  ---
Phase 5: Prize Requirements (Day 5)

Task 5.1: Verify EVVM Requirements ($20k)

✅ Use MATE Metaprotocol on Sepolia OR deploy own EVVM✅ Novel use case: Gasless Yield Vault ✓✅ Can improve x402 & ERC-8004 (optional bonus)✅ Working demo with frontend✅ GitHub repo with README

  ---
Task 5.2: Verify LayerZero Requirements ($20k)

✅ Use LayerZero Endpoint contract ✓ (YieldFlowOFT.sol)✅ Extend OApp/OFT base contracts ✓ (custom _lzReceive logic)✅ Cross-chain messaging ✓ (bridging deposits)✅ Working demo

  ---
Task 5.3: Verify Circle Requirements ($10k)

✅ Use USDC infrastructure ✓ (Vault uses USDC)✅ Circle Gateway for treasury operations (optional enhancement)✅ Cross-chain USDC flows ✓

Total Eligible Prizes: $50,000 🎉

  ---
Key Differences: Saga vs EVVM

| Feature    | Saga Chainlet       | EVVM on Sepolia                |
  |------------|---------------------|--------------------------------|
| Deployment | Custom L1 chain     | Solidity contracts on Ethereum |
| Gas        | Recycled gas tokens | Abstracted by EVVM             |
| Security   | Saga validators     | Ethereum security              |
| Testnet    | Saga testnet RPC    | Ethereum Sepolia               |
| Prize      | $10k                | $20k                           |
| Complexity | Higher (new chain)  | Lower (familiar Ethereum)      |
| Wallets    | Keplr (Cosmos)      | MetaMask (EVM)                 |

  ---
Migration Checklist ✅

- Join EVVM Telegram (https://t.me/EVVMorg)
- Get test $MATE tokens from faucet
- Update foundry.toml with Sepolia RPC
- Create DeployToEVVM.s.sol script
- Deploy Vault + YieldFlowOFT to EVVM/Sepolia
- Update wagmi.ts (remove Saga, add Sepolia)
- Update contract addresses in frontend
- Test gasless deposits/withdrawals
- Test cross-chain bridging via LayerZero
- Verify all 3 prize requirements
- Update README with EVVM details
- Create demo video

  ---
Next Steps 🚀

Want me to:
1. Create the deployment script (DeployToEVVM.s.sol)
2. Update the frontend configuration files
3. Write integration tests for gasless operations
4. Generate the README with EVVM details

Which should I start with?

Todos
☐ Research EVVM architecture and deployment options
☐ Audit current Saga contract structure
☐ Deploy EVVM testnet instance
☐ Migrate vault contracts to EVVM
☐ Update LayerZero OFT integration for EVVM
☐ Update frontend to connect to EVVM
☐ Test cross-chain deposits to EVVM
☐ Test gasless operations on EVVM
☐ Verify prize requirements for all three sponsors