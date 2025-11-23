# Contract Integration Guide

This document explains how contracts are integrated into the FreeFi frontend.

## 📁 File Structure

```
frontend/src/
├── lib/
│   ├── contracts.ts          # Contract addresses by chain
│   ├── abis/
│   │   ├── index.ts          # ABI exports
│   │   ├── VaultEVVM.abi.json
│   │   ├── YieldFlowOFTEVVM.abi.json
│   │   └── MockERC20.abi.json
│   └── wagmi.ts              # Wagmi configuration
└── hooks/
    ├── useContracts.ts       # Hook to get contracts for current chain
    └── useVaultBalance.ts    # Hook to read vault balance
```

## 🔄 Regenerating ABIs and Addresses

Whenever you redeploy contracts or make changes:

```bash
# From project root
make frontend-setup
```

This will:
1. Build contracts with `forge build`
2. Extract ABIs from compiled JSON artifacts using `jq`
3. Copy them to `frontend/src/lib/abis/` as valid JSON
4. Verify contract addresses are up to date

**Important:** ABIs are extracted from `blockchain/out/` directory using:
```bash
cat out/ContractName.sol/ContractName.json | jq '.abi' > ../frontend/src/lib/abis/ContractName.abi.json
```

This ensures valid JSON format (not table output from `forge inspect`).

## 🎯 Using Contracts in Components

### 1. Get Contract Addresses

```typescript
import { useContracts } from '@/hooks/useContracts';

function MyComponent() {
    const { vault, oft, usdc, hasVault, chainId } = useContracts();

    if (!hasVault) {
        return <div>Please switch to Sepolia</div>;
    }

    return (
        <div>
            <p>Vault: {vault?.address}</p>
            <p>OFT: {oft?.address}</p>
        </div>
    );
}
```

### 2. Read Contract Data

```typescript
import { useReadContract } from 'wagmi';
import { useContracts } from '@/hooks/useContracts';

function VaultInfo() {
    const { vault } = useContracts();

    const { data: totalDeposits } = useReadContract({
        address: vault?.address,
        abi: vault?.abi,
        functionName: 'totalDeposits',
    });

    return <div>Total Deposits: {totalDeposits?.toString()}</div>;
}
```

### 3. Use Pre-built Hooks

```typescript
import { useVaultBalance } from '@/hooks/useVaultBalance';

function MyBalance() {
    const { formattedUsdcValue, isLoading } = useVaultBalance();

    if (isLoading) return <div>Loading...</div>;

    return <div>Your Balance: ${formattedUsdcValue.toFixed(2)}</div>;
}
```

### 4. Write to Contracts

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContracts } from '@/hooks/useContracts';

function DepositButton() {
    const { vault } = useContracts();
    const { writeContract, data: hash } = useWriteContract();

    const { isLoading, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleDeposit = async () => {
        if (!vault) return;

        writeContract({
            address: vault.address,
            abi: vault.abi,
            functionName: 'deposit',
            args: [1000000n], // 1 USDC (6 decimals)
        });
    };

    return (
        <button onClick={handleDeposit} disabled={isLoading}>
            {isLoading ? 'Depositing...' : 'Deposit'}
        </button>
    );
}
```

## 📝 Contract Addresses

### Sepolia (Destination Chain)
- **Vault:** `0x1ee2dD0affe7B538a101002be3126729D1D2A83b`
- **OFT:** `0x59Fc30C92Ef8a9F0349666C5d95d850C2CeD146f`
- **USDC:** `0xc4F827D8E7D3bA0f32aB60c3627542A14F479adF`
- **EVVM:** `0x9902984d86059234c3B6e11D5eAEC55f9627dD0f`

### Arbitrum Sepolia (Source Chain)
- **OFT:** `0x427996809fA5603a60FAeccA43235efb30E72665`
- **USDC:** `0x3f7D9268c821f9409A614aDdac2d213506FF6B66`

## 🔍 Key Contract Functions

### VaultEVVM

**Read Functions:**
- `userShares(address)` - Get user's vault shares
- `totalShares()` - Get total vault shares
- `totalDeposits()` - Get total USDC deposited
- `calculateUsdcAmount(uint256 shares)` - Convert shares to USDC
- `getNonce(address)` - Get user's current nonce for signatures

**Write Functions:**
- `deposit(uint256 amount)` - Deposit USDC (requires approval)
- `withdraw(uint256 shares)` - Withdraw USDC
- `depositGasless(address user, uint256 amount, uint256 nonce, bytes signature)` - Gasless deposit
- `withdrawGasless(address user, uint256 shares, uint256 nonce, bytes signature)` - Gasless withdrawal

### YieldFlowOFTEVVM

**Read Functions:**
- `balanceOf(address)` - Get OFT token balance
- `quoteSend(SendParam)` - Quote cross-chain transfer fee

**Write Functions:**
- `send(SendParam, MessagingFee, address)` - Send tokens cross-chain
- `mintWithUsdc(uint256 amount)` - Mint OFT tokens with USDC
- `burnForUsdc(uint256 amount)` - Burn OFT tokens for USDC

### MockERC20 (USDC)

**Read Functions:**
- `balanceOf(address)` - Get token balance
- `allowance(address owner, address spender)` - Get approval amount

**Write Functions:**
- `approve(address spender, uint256 amount)` - Approve token spending
- `transfer(address to, uint256 amount)` - Transfer tokens

## 🚀 Next Steps

1. **Show Real Balances** - Update DashboardView to use `useVaultBalance()`
2. **Implement Deposits** - Connect DepositPanel to actual contracts
3. **Implement Withdrawals** - Add gasless signature flow
4. **Handle Approvals** - Add USDC approval flow before deposits

## 🛠️ Development Commands

```bash
# Generate ABIs and update addresses (full setup)
make frontend-setup

# Just regenerate ABIs (faster)
make abis

# Just verify contract addresses
make contracts

# Start frontend dev server
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build

# View all available commands
make help
```

## 🔧 Troubleshooting

### ABIs Not Valid JSON

If you get errors like "Cannot parse JSON: Unexpected token '╭'":

**Problem:** ABIs were generated using `forge inspect` which outputs tables, not JSON.

**Solution:** Run `make abis` which properly extracts ABIs from compiled artifacts:
```bash
make abis
```

This uses `jq` to extract the `.abi` field from `out/ContractName.sol/ContractName.json`.

### Contract Addresses Not Found

If contract addresses are missing or `0x0`:

**Problem:** Contracts haven't been deployed yet or deployment files are missing.

**Solution:** Deploy contracts first:
```bash
# Deploy all contracts on Sepolia
cd blockchain && ./deploy-full.sh

# Then update frontend
cd .. && make contracts
```

### Network Mismatch

If the app shows "Unknown Network":

**Problem:** Connected to unsupported network.

**Solution:** Switch to Sepolia, Arbitrum Sepolia, or Base Sepolia in MetaMask.

## 📚 Resources

- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)
- [RainbowKit Docs](https://rainbowkit.com)
