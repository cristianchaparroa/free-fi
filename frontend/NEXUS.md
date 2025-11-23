# Nexus SDK Integration Guide

Complete guide for the Avail Nexus SDK integration in the cross-chain DeFi yield optimizer.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Core Components](#core-components)
5. [Deployment Flows](#deployment-flows)
6. [API Reference](#api-reference)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Nexus SDK integration enables seamless cross-chain operations including:

- **Token Bridging**: Move assets between supported chains
- **Cross-chain Swaps**: Exchange tokens across different networks
- **Atomic Execution**: Bridge + protocol deposit in single transaction
- **Unified Balances**: View aggregated portfolio across all chains

### Supported Chains

| Chain | Chain ID | Mainnet | Testnet |
|-------|----------|---------|---------|
| Ethereum | 1 | ✅ | Sepolia (11155111) |
| Polygon | 137 | ✅ | Amoy (80002) |
| Base | 8453 | ✅ | Base Sepolia (84532) |
| Arbitrum | 42161 | ✅ | Arbitrum Sepolia (421614) |
| Optimism | 10 | ✅ | Optimism Sepolia (11155420) |

### Supported Tokens

- **ETH**: Native Ethereum and wrapped versions
- **USDC**: USD Coin (6 decimals)
- **USDT**: Tether USD (6 decimals)
- **POL/MATIC**: Polygon native token (18 decimals)

---

## Architecture

### Component Structure

```
src/
├── lib/
│   ├── nexus.ts              # Core Nexus SDK manager
│   ├── protocols.ts          # DeFi protocol integrations
│   ├── defiLlama.ts          # Yield data fetching
│   └── yields.ts             # Yield utilities
├── hooks/
│   └── useNexus.ts           # React hook for SDK lifecycle
└── components/
    └── dashboard/
        ├── YieldOpportunities.tsx   # Opportunity display
        ├── DeployModal.tsx          # Deployment UI
        └── UnifiedBalance.tsx       # Balance aggregation
```

### Data Flow

```
User Action → YieldOpportunities Component
              ↓
         DeployModal (UI)
              ↓
    nexusManager.deployToOpportunity()
              ↓
    ┌─────────┴──────────┐
    │                    │
Case 1: Token Swap    Case 2: Same Token
    │                    │
swap() → bridge()    bridgeAndExecute()
    ↓                    ↓
Manual Deposit      Atomic Deposit
```

---

## Setup & Configuration

### 1. Environment Variables

Create `.env.local`:

```bash
# WalletConnect Project ID (required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Network Mode: 'mainnet' or 'testnet'
NEXT_PUBLIC_NETWORK_MODE=mainnet
```

### 2. Install Dependencies

```bash
npm install @avail-project/nexus-core wagmi viem @rainbow-me/rainbowkit
```

### 3. Initialize Nexus SDK

The SDK is automatically initialized when a wallet connects:

```typescript
// In your component
import { useNexus } from '@/hooks/useNexus';

function MyComponent() {
  const { isInitialized, nexusManager } = useNexus();

  if (!isInitialized) {
    return <div>Initializing Nexus SDK...</div>;
  }

  // Use nexusManager for operations
}
```

---

## Core Components

### 1. NexusManager (`src/lib/nexus.ts`)

Main class for all Nexus SDK operations.

#### Initialization

```typescript
import { nexusManager } from '@/lib/nexus';

// SDK initializes automatically via useNexus hook
// Manual initialization (not recommended):
await nexusManager.initialize(ethereumProvider);
```

#### Check Initialization Status

```typescript
if (nexusManager.isInitialized()) {
  // SDK is ready
}
```

### 2. useNexus Hook (`src/hooks/useNexus.ts`)

React hook that manages SDK lifecycle:

```typescript
import { useNexus } from '@/hooks/useNexus';

function MyComponent() {
  const { isInitialized, nexusManager } = useNexus();

  useEffect(() => {
    if (isInitialized) {
      // SDK ready, can make calls
    }
  }, [isInitialized]);
}
```

**Features:**
- Automatic initialization on wallet connect
- Prevents re-initialization on chain switch
- Handles errors gracefully

### 3. Protocol Integration (`src/lib/protocols.ts`)

Handles DeFi protocol-specific logic:

```typescript
import { getProtocolDepositData } from '@/lib/protocols';

// Generate deposit calldata for Aave
const depositData = getProtocolDepositData(
  'aave-v3',      // protocol name
  'USDC',         // token
  '100',          // amount
  8453,           // chain ID (Base)
  userAddress     // recipient
);

// Returns: { address: '0x...', data: '0x617ba037...' }
```

**Supported Protocols:**
- Aave V3: `supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)`
- Compound V3: `supply(address asset, uint256 amount)`

---

## Deployment Flows

### Case 1: Token Swap Required

When user has different token than opportunity requires (e.g., has ETH, needs USDC):

```typescript
const result = await nexusManager.deployToOpportunity(
  opportunity,      // { protocol, chain, chainId, token, apy, ... }
  '100',           // amount
  1,               // currentChainId (Ethereum)
  userAddress,     // 0x...
  walletClient,    // from wagmi
  'ETH'            // sourceToken (different from opportunity.token)
);
```

**Steps:**
1. Switch to source chain (if needed)
2. Approve source token spending → **User signs**
3. Swap source token → target token via Nexus
4. Bridge target token to destination chain
5. User manually deposits to protocol (requires gas on destination)

**Limitations:**
- POL swaps currently not supported (blocked with error message)
- Requires gas token on destination chain
- Multiple user signatures needed

### Case 2: Same Token (Recommended)

When user already has the token opportunity requires (e.g., has USDC, needs USDC):

```typescript
const result = await nexusManager.deployToOpportunity(
  opportunity,      // { protocol, chain, chainId, token: 'USDC', ... }
  '100',           // amount
  1,               // currentChainId (Ethereum)
  userAddress,     // 0x...
  walletClient,    // from wagmi
  undefined        // no sourceToken = same token
);
```

**Steps:**
1. Switch to source chain (if needed)
2. Call `bridgeAndExecute()` → **User signs ONCE**
3. Nexus atomically:
   - Bridges tokens to destination chain
   - Approves protocol spending
   - Deposits to protocol
4. Done! ✅

**Advantages:**
- Single user signature
- Atomic transaction (all-or-nothing)
- No manual deposit needed
- Saves gas and time

---

## API Reference

### NexusManager Methods

#### `initialize(provider: any): Promise<void>`

Initialize the Nexus SDK with an Ethereum provider.

```typescript
await nexusManager.initialize(ethereumProvider);
```

**Note:** Usually called automatically by `useNexus` hook.

---

#### `isInitialized(): boolean`

Check if SDK is ready to use.

```typescript
if (nexusManager.isInitialized()) {
  // Make SDK calls
}
```

---

#### `getUnifiedBalances(includeSwappable?: boolean): Promise<Balance[]>`

Get user's token balances across all supported chains.

```typescript
const balances = await nexusManager.getUnifiedBalances(true);

// Returns:
// [
//   { token: 'USDC', chain: 'Ethereum', amount: '1000.5', usdValue: 1000.5 },
//   { token: 'ETH', chain: 'Base', amount: '0.5', usdValue: 1750.0 },
//   ...
// ]
```

**Parameters:**
- `includeSwappable` (boolean): Include tokens that can be swapped to target token

**Returns:** Array of balance objects with:
- `token`: Token symbol
- `chain`: Chain name
- `amount`: Formatted amount string
- `usdValue`: USD value (if available)

---

#### `bridge(token, amount, sourceChainId, targetChainId, onProgress?)`

Bridge tokens from one chain to another.

```typescript
const result = await nexusManager.bridge(
  'USDC',          // token
  '100',           // amount (string)
  1,               // Ethereum
  8453,            // Base
  (message, data) => console.log(message)  // optional progress callback
);
```

**Parameters:**
- `token`: Token symbol ('ETH', 'USDC', 'USDT', 'POL')
- `amount`: Amount as string (e.g., '100.5')
- `sourceChainId`: Source chain ID
- `targetChainId`: Destination chain ID
- `onProgress`: Optional callback for progress updates

**Returns:** Transaction result with:
- `hash`: Transaction hash
- `explorerUrl`: Block explorer link

---

#### `swap(sourceToken, targetToken, amount, sourceChainId, targetChainId, onProgress?)`

Swap one token for another across chains.

```typescript
const result = await nexusManager.swap(
  'ETH',           // source token
  'USDC',          // target token
  '1',             // amount
  1,               // source chain (Ethereum)
  8453,            // target chain (Base)
  (message) => console.log(message)
);
```

**Parameters:**
- `sourceToken`: Source token symbol
- `targetToken`: Target token symbol
- `amount`: Amount as string
- `sourceChainId`: Source chain ID
- `targetChainId`: Target chain ID
- `onProgress`: Optional progress callback

**Limitations:**
- POL swaps currently blocked (SDK limitation)
- May require multiple approvals

**Returns:** Swap transaction result

---

#### `bridgeAndExecute(token, amount, sourceChainId, targetChainId, protocolAddress, depositData, userAddress, onProgress?)`

**⭐ Recommended Method** - Atomically bridge tokens and execute protocol deposit.

```typescript
const result = await nexusManager.bridgeAndExecute(
  'USDC',                    // token
  '100',                     // amount
  1,                         // source chain (Ethereum)
  8453,                      // target chain (Base)
  '0xAaveV3PoolAddress',     // protocol contract
  '0x617ba037...',           // encoded deposit function call
  userAddress,               // user's address
  (step) => console.log(step)
);
```

**Parameters:**
- `token`: Token symbol
- `amount`: Amount as string
- `sourceChainId`: Source chain ID
- `targetChainId`: Target chain ID
- `protocolAddress`: Protocol contract address on target chain
- `depositData`: ABI-encoded function call
- `userAddress`: User's wallet address
- `onProgress`: Optional progress callback

**Events:**
- `BRIDGE_EXECUTE_EXPECTED_STEPS`: Total steps needed
- `BRIDGE_EXECUTE_COMPLETED_STEPS`: Step completed

**Returns:** Execution result with transaction details

---

#### `deployToOpportunity(opportunity, amount, currentChainId, userAddress, walletClient, sourceToken?, onProgress?)`

**High-level deployment method** - Automatically handles token swaps, bridging, and protocol deposits.

```typescript
const result = await nexusManager.deployToOpportunity(
  {
    protocol: 'aave-v3',
    chain: 'Base',
    chainId: 8453,
    token: 'USDC',
    apy: 5.2,
    tvl: 50000000,
    riskScore: 3
  },
  '100',              // amount
  1,                  // current chain ID
  '0x...',            // user address
  walletClient,       // wagmi wallet client
  'ETH',              // optional: source token if different
  (msg, data) => console.log(msg)
);
```

**Automatically determines flow:**
- If `sourceToken` provided: Uses Case 1 (swap + bridge + deposit)
- If `sourceToken` not provided: Uses Case 2 (bridgeAndExecute)

**Returns:** Deployment result with:
- `success`: boolean
- `hash`: Transaction hash
- `explorerUrl`: Block explorer link
- `message`: Human-readable result

---

## Examples

### Example 1: Get Unified Balance

```typescript
import { useNexus } from '@/hooks/useNexus';
import { useAccount } from 'wagmi';

function BalanceDisplay() {
  const { isInitialized, nexusManager } = useNexus();
  const { address } = useAccount();
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    if (isInitialized && address) {
      nexusManager.getUnifiedBalances(true)
        .then(setBalances)
        .catch(console.error);
    }
  }, [isInitialized, address]);

  return (
    <div>
      {balances.map((b, i) => (
        <div key={i}>
          {b.amount} {b.token} on {b.chain}
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Simple Bridge

```typescript
import { nexusManager } from '@/lib/nexus';

async function bridgeTokens() {
  try {
    const result = await nexusManager.bridge(
      'USDC',
      '100',
      1,      // Ethereum
      8453,   // Base
      (message, data) => {
        console.log('Progress:', message);
      }
    );

    console.log('Bridge successful!', result.explorerUrl);
  } catch (error) {
    console.error('Bridge failed:', error);
  }
}
```

### Example 3: Deploy with bridgeAndExecute

```typescript
import { nexusManager } from '@/lib/nexus';
import { getProtocolDepositData } from '@/lib/protocols';

async function deployToAave() {
  const userAddress = '0x...';

  // Generate Aave deposit calldata
  const depositData = getProtocolDepositData(
    'aave-v3',
    'USDC',
    '100',
    8453,      // Base
    userAddress
  );

  if (!depositData) {
    throw new Error('Protocol not supported on this chain');
  }

  // Execute atomic bridge + deposit
  const result = await nexusManager.bridgeAndExecute(
    'USDC',
    '100',
    1,                    // from Ethereum
    8453,                 // to Base
    depositData.address,  // Aave pool address
    depositData.data,     // deposit() function call
    userAddress,
    (event) => {
      if (event.type === 'steps') {
        console.log('Total steps:', event.steps);
      } else if (event.type === 'complete') {
        console.log('Step complete:', event.step);
      }
    }
  );

  console.log('Deployed successfully!', result);
}
```

### Example 4: Full Deployment Flow

```typescript
import { nexusManager } from '@/lib/nexus';
import { useAccount, useWalletClient } from 'wagmi';

function DeployButton({ opportunity }) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState('');

  async function handleDeploy() {
    try {
      setStatus('Deploying...');

      const result = await nexusManager.deployToOpportunity(
        opportunity,
        '100',          // amount
        chainId,        // current chain
        address,        // user address
        walletClient,   // wallet client
        undefined,      // no source token = use bridgeAndExecute
        (message, data) => {
          setStatus(message);
        }
      );

      setStatus('Success! View on explorer: ' + result.explorerUrl);
    } catch (error) {
      setStatus('Failed: ' + error.message);
    }
  }

  return (
    <div>
      <button onClick={handleDeploy}>Deploy</button>
      <div>{status}</div>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: "Nexus SDK not initialized"

**Cause:** Trying to use SDK before initialization completes.

**Solution:**
```typescript
const { isInitialized, nexusManager } = useNexus();

if (!isInitialized) {
  return <div>Loading...</div>;
}

// Now safe to use nexusManager
```

---

### Issue: "Cannot read properties of null"

**Cause:** SDK re-initialization attempted, causing null reference.

**Solution:**
- Fixed in current implementation
- SDK only initializes once per wallet connection
- Chain switches don't trigger re-initialization

---

### Issue: "The current chain does not match target chain"

**Cause:** Wallet is on different chain than transaction requires.

**Solution:**
- Automatic chain switching implemented
- User will see wallet popup to switch chains
- If user rejects, transaction will fail

```typescript
// Handled automatically in nexusManager.deployToOpportunity()
// But you can also switch manually:
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: `0x${targetChainId.toString(16)}` }],
});
```

---

### Issue: "Insufficient balance" with POL swap

**Cause:** POL token swaps not well supported by Nexus SDK routing.

**Solution:**
- POL swaps are currently blocked
- Use POL opportunities directly (no swap needed)
- Or swap POL → USDC on DEX first, then deploy USDC

```typescript
// This will throw clear error:
await nexusManager.swap('POL', 'USDC', '10', 137, 8453);
// Error: Direct POL→USDC swap is not supported yet...
```

---

### Issue: "User rejected the request"

**Cause:** User needs gas token on destination chain, or cancelled transaction.

**Solution:**
- Bridge ETH to destination chain first (even $5-10 for gas)
- Use `bridgeAndExecute` (Case 2) to minimize required gas
- Check wallet has sufficient gas before deploying

---

### Issue: Balance not showing after deployment

**Cause:** Balance cache not refreshed.

**Solution:**
```typescript
// Re-fetch balances after deployment
await nexusManager.getUnifiedBalances(true);
```

---

## Advanced Topics

### Token Decimals Handling

The SDK automatically handles different decimal places:

```typescript
// USDC/USDT: 6 decimals
const usdcAmount = BigInt(100 * 10**6);  // 100 USDC

// ETH/POL/DAI: 18 decimals
const ethAmount = BigInt(1 * 10**18);    // 1 ETH
```

**Note:** All amount strings are converted internally:

```typescript
const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
```

---

### Custom Token Addresses

Token addresses per chain are configured in `src/lib/nexus.ts`:

```typescript
const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',     // Ethereum
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',   // Polygon
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
    // ...
  },
  // ...
};
```

To add a new token, update this mapping and the supported tokens list.

---

### Protocol Contract Addresses

Protocol addresses are in `src/lib/protocols.ts`:

```typescript
export const PROTOCOL_ADDRESSES = {
  'aave-v3': {
    1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',      // Ethereum
    137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',    // Polygon
    8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',   // Base
    // ...
  },
  'compound-v3': {
    1: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',      // Ethereum USDC
    8453: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',   // Base USDC
    // ...
  },
};
```

---

### Adding New Protocols

To add a new protocol:

1. **Add contract addresses** in `protocols.ts`:
```typescript
'my-protocol': {
  1: '0x...',
  // ...
}
```

2. **Create encode function** for deposit:
```typescript
export function encodeMyProtocolDeposit(
  tokenAddress: string,
  amount: bigint,
  userAddress: string
): `0x${string}` {
  // ABI encode the deposit function
  const selector = '0x...';  // function selector
  // ... encode parameters
  return encodedData;
}
```

3. **Update `getProtocolDepositData()`**:
```typescript
if (normalizedProtocol.includes('myprotocol')) {
  const address = PROTOCOL_ADDRESSES['my-protocol']?.[chainId];
  return {
    address,
    data: encodeMyProtocolDeposit(tokenAddress, amountBigInt, userAddress),
  };
}
```

4. **Test with a small amount first!**

---

## Best Practices

### 1. Always Check SDK Initialization

```typescript
const { isInitialized } = useNexus();

if (!isInitialized) {
  return <LoadingState />;
}
```

### 2. Use bridgeAndExecute When Possible

```typescript
// ✅ GOOD: Single transaction
await nexusManager.deployToOpportunity(
  opportunity,
  amount,
  chainId,
  address,
  walletClient,
  undefined  // no sourceToken = uses bridgeAndExecute
);

// ❌ AVOID: Multi-step when not needed
await nexusManager.swap(...);
await nexusManager.bridge(...);
// ... manual deposit
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await nexusManager.deployToOpportunity(...);
  showSuccessMessage(result);
} catch (error) {
  if (error.message.includes('User rejected')) {
    showMessage('Transaction cancelled');
  } else if (error.message.includes('Insufficient balance')) {
    showMessage('Not enough balance');
  } else {
    showMessage('Deployment failed: ' + error.message);
  }
}
```

### 4. Provide Progress Feedback

```typescript
await nexusManager.deployToOpportunity(
  // ...
  (message, data) => {
    setProgress(message);  // Update UI
    console.log('Progress:', message, data);
  }
);
```

### 5. Test on Testnet First

```bash
# Set to testnet mode
NEXT_PUBLIC_NETWORK_MODE=testnet

# Get testnet tokens from faucets
# Test full flow before mainnet deployment
```

---

## Performance Considerations

### Gas Optimization

- **Use bridgeAndExecute**: Saves ~40% gas vs. multi-step
- **Batch operations**: When deploying to multiple protocols
- **Monitor gas prices**: Deploy during low-traffic periods

### Caching

Balance queries are cached for 15 seconds:

```typescript
// First call: fetches from chain
const balances1 = await nexusManager.getUnifiedBalances();

// Within 15s: returns cached result
const balances2 = await nexusManager.getUnifiedBalances();
```

### Concurrent Operations

Multiple deployments can run in parallel:

```typescript
const deployments = opportunities.map(opp =>
  nexusManager.deployToOpportunity(opp, amount, ...)
);

const results = await Promise.allSettled(deployments);
```

---

## Security Notes

1. **Never expose private keys** or mnemonics
2. **Validate user inputs** before passing to SDK
3. **Check balances** before deploying
4. **Use reputable protocols** only (Aave, Compound, etc.)
5. **Test with small amounts** first
6. **Monitor transactions** on block explorers
7. **Set reasonable slippage** tolerances (0.5-1%)
8. **Verify contract addresses** before deployment

---

## Resources

- **Nexus SDK Docs**: https://docs.availproject.org/docs/build-with-avail/Nexus/overview
- **DeFi Llama API**: https://defillama.com/docs/api
- **Wagmi Docs**: https://wagmi.sh
- **Viem Docs**: https://viem.sh

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [Examples](#examples)
3. Open an issue on GitHub
4. Join Avail Discord community

---

**Last Updated**: November 2024
**Version**: 1.0.0
