# Deployment Instructions for Fixed VaultEVVM Contract

## Status

✅ **Contract Code Fixed:** `/blockchain/src/VaultEVVM.sol` has been updated to use standard EVVM signature format
✅ **Frontend Code Fixed:** `/frontend/src/lib/gasless.ts` now uses `@evvm/viem-signature-library`
❌ **Deployed Contract:** The contract at `0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA` is **NOT using the updated code**

## The Issue

The trace shows the deployed contract is computing hash `0x7da3c4be...` but the frontend/EVVM library is creating hash `0xafab654e...`. This means:

1. Either the contract wasn't recompiled before deployment, OR
2. The deployment used cached/old bytecode

## Steps to Deploy the Fixed Contract

### 1. Clean and Rebuild
```bash
cd blockchain
forge clean
forge build
```

This ensures we're using the freshly updated Solidity code.

### 2. Deploy the Updated Contract
```bash
# Make sure you have these environment variables set:
# - PRIVATE_KEY: Deployer's private key
# - SEPOLIA_RPC_URL: Sepolia RPC endpoint

forge script script/DeployVaultEVVM.s.sol:DeployVaultEVVM \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# OR use the combined deployment script:
forge script script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### 3. Update Frontend Configuration

After deployment, update these files with the new vault address:

**File: `frontend/src/lib/contracts.ts`**
```typescript
export const CONTRACTS = {
  sepolia: {
    chainId: 11155111,
    vault: '0xNEW_VAULT_ADDRESS_HERE', // ← Update this
    // ... rest stays the same
  },
}
```

**File: `frontend/src/app/api/executor/route.ts`**
```typescript
const VAULT_ADDRESS = '0xNEW_VAULT_ADDRESS_HERE' as `0x${string}`; // ← Update this
```

### 4. Setup the New Contract

After deploying, you need to configure the new vault:

```bash
# 1. Enable gasless mode (should be enabled by default, but verify)
cast send $NEW_VAULT_ADDRESS "setGaslessMode(bool)" true \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL

# 2. Verify gasless is enabled
cast call $NEW_VAULT_ADDRESS "gaslessEnabled()(bool)" \
  --rpc-url $SEPOLIA_RPC_URL

# 3. Check the executor address (if you want to set a specific executor)
cast call $NEW_VAULT_ADDRESS "executor()(address)" \
  --rpc-url $SEPOLIA_RPC_URL

# 4. Set executor if needed (for automated rebalancing)
cast send $NEW_VAULT_ADDRESS "setExecutor(address)" $EXECUTOR_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

### 5. Verify the Fix Works

Test the new contract manually:

```bash
# The message should be: "11155111,depositGasless,0x73d1770e68636029cfa3f3eb9c050fc85d063b0d,1000000,0"
# Sign this message with your wallet and get the signature

# Then call the contract:
cast call $NEW_VAULT_ADDRESS \
  "depositGasless(address,uint256,uint256,bytes)(uint256)" \
  0x73D1770E68636029Cfa3F3eb9c050fc85D063b0d \
  1000000 \
  0 \
  $YOUR_SIGNATURE \
  --from $EXECUTOR_ADDRESS \
  --rpc-url $SEPOLIA_RPC_URL \
  --trace
```

If it works, you should see:
- No `InvalidSignature()` revert
- Successful ecrecover matching the user address

## What Changed in the Contract

### Before (Assembly-based, INCOMPATIBLE):
```solidity
// Custom assembly layout - NOT standard EVVM
assembly {
    let ptr := mload(0x40)
    mstore(ptr, "VaultEVVM.depositGasless")
    mstore(add(ptr, 0x18), shl(96, user))
    // ... etc
    messageHash := keccak256(ptr, 0xac)
}
```

### After (Standard EVVM Format, COMPATIBLE):
```solidity
// Standard EVVM format: "<chainId>,<functionName>,<params>"
string memory message = string(
    abi.encodePacked(
        Strings.toString(block.chainid),
        ",depositGasless,",
        Strings.toHexString(uint160(user), 20),
        ",",
        Strings.toString(amount),
        ",",
        Strings.toString(nonce)
    )
);
bytes32 messageHash = keccak256(bytes(message));
```

This now matches the EVVM ecosystem standard!

## Benefits of the Fix

✅ **Ecosystem Compatible:** Works with `@evvm/viem-signature-library`
✅ **Tooling Support:** Can use EVVM Signature Constructor
✅ **Standard Format:** Follows EVVM documentation
✅ **Maintainable:** Uses well-tested library code
✅ **Debuggable:** Message format is human-readable

## Testing Checklist

After deploying:

- [ ] Contract compiles without errors
- [ ] Contract deploys successfully
- [ ] Frontend config updated with new addresses
- [ ] Gasless mode is enabled
- [ ] User can approve USDC
- [ ] User can sign deposit message
- [ ] Signature validates correctly
- [ ] Deposit transaction succeeds
- [ ] Shares are minted correctly
- [ ] User balance reflects deposit

## Troubleshooting

### If signature still fails:

1. **Check the message format:**
   ```bash
   # Should output: "11155111,depositGasless,0x<lowercase_user>,<amount>,<nonce>"
   ```

2. **Verify contract code:**
   ```bash
   cast code $VAULT_ADDRESS --rpc-url $SEPOLIA_RPC_URL | wc -c
   # Should be similar to previous deployment (~16000+ bytes)
   ```

3. **Test signature recovery manually:**
   ```bash
   cast wallet verify \
     --address $USER_ADDRESS \
     "$MESSAGE" \
     $SIGNATURE
   ```

4. **Check on-chain with trace:**
   ```bash
   cast call $VAULT_ADDRESS "depositGasless(...)" ... --trace
   # Look at the ecrecover call - does recovered address match user?
   ```

## Next Steps

1. **Deploy the fixed contract** using the commands above
2. **Update frontend configuration** with new addresses
3. **Test end-to-end** with a small deposit
4. **Document the new contract addresses** in your deployment records
5. **Update any external integrations** that reference the old vault address

---

**Note:** Make sure to save the old vault address in case you need to recover any funds or migrate user balances to the new contract!
