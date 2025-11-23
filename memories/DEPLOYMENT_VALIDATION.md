# Deployment & Frontend Setup Validation

## Overview

This document validates the deployment workflow and identifies issues with the current deployment process.

---

## Workflow Analysis

### 1. Deployment Script (`deploy-full.sh`)

**What it does:**
```bash
./blockchain/deploy-full.sh
```

✅ **GOOD:**
- Deploys contracts on multiple chains (Sepolia, Arbitrum Sepolia, Base Sepolia)
- Uses `script/DeployAll.s.sol` for Sepolia (vault + OFT)
- Creates JSON files in `blockchain/deployments/`:
  - `sepolia-complete.json` - Full Sepolia deployment info
  - `oft-arbitrum-sepolia.json` - Arbitrum OFT deployment
  - `oft-base-sepolia.json` - Base OFT deployment (if enabled)
- Configures LayerZero peers automatically
- Verifies contracts on Etherscan

⚠️ **ISSUE FOUND:**
The deployment script does **NOT** automatically update frontend files! Users must manually run:
```bash
make frontend-setup
```

---

### 2. Frontend Setup (`make frontend-setup`)

**What it does:**
```bash
make frontend-setup
```

This runs two sub-commands:
1. `make abis` - Extracts contract ABIs
2. `make contracts` - Updates contract addresses

#### 2a. ABI Generation (`make abis`)

✅ **GOOD:**
```bash
forge build
jq '.abi' out/VaultEVVM.sol/VaultEVVM.json > frontend/src/lib/abis/VaultEVVM.abi.json
jq '.abi' out/YieldFlowOFTEVVM.sol/YieldFlowOFTEVVM.json > frontend/src/lib/abis/YieldFlowOFTEVVM.abi.json
jq '.abi' out/MockERC20.sol/MockERC20.json > frontend/src/lib/abis/MockERC20.abi.json
```

- Rebuilds contracts with `forge build`
- Extracts ABIs from compiled artifacts
- Saves to `frontend/src/lib/abis/`

✅ This ensures ABIs match the **latest compiled code**.

#### 2b. Contract Address Updates (`make contracts`)

**Updates two files:**

**File 1: `frontend/src/lib/contracts.ts`**
```bash
VAULT=$(jq -r '.vault' blockchain/deployments/sepolia-complete.json)
OFT=$(jq -r '.oft' blockchain/deployments/sepolia-complete.json)
USDC=$(jq -r '.usdc' blockchain/deployments/sepolia-complete.json)

sed -i "s/vault: '0x[a-fA-F0-9]*'/vault: '$VAULT'/" frontend/src/lib/contracts.ts
sed -i "s/oft: '0x[a-fA-F0-9]*'/oft: '$OFT'/" frontend/src/lib/contracts.ts
sed -i "s/usdc: '0x[a-fA-F0-9]*'/usdc: '$USDC'/" frontend/src/lib/contracts.ts
```

**File 2: `frontend/src/app/api/executor/route.ts`**
```bash
sed -i "s/const VAULT_ADDRESS = '0x[a-fA-F0-9]*'/const VAULT_ADDRESS = '$VAULT'/" \
  frontend/src/app/api/executor/route.ts
```

✅ This ensures frontend uses the **deployed contract addresses**.

---

## Current Deployment Status

### Deployment Files

**`blockchain/deployments/sepolia-complete.json`:**
```json
{
  "chainId": 11155111,
  "usdc": "0xb7BB688Fc0B4d2785337d47c4b69F2Ec5ac791c9",
  "vault": "0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA",
  "oft": "0x52Ae371913cD159070A90c0f8015C3d9af04869C",
  "feeCollector": "0x73D1770E68636029Cfa3F3eb9c050fc85D063b0d",
  "executor": "0x73D1770E68636029Cfa3F3eb9c050fc85D063b0d",
  "evvm": "0x9902984d86059234c3B6e11D5eAEC55f9627dD0f",
  "nameService": "0x8038e87dc67D87b31d890FD01E855a8517ebfD24",
  "lzEndpoint": "0x6EDCE65403992e310A62460808c4b910D972f10f",
  "lzEid": 40161
}
```

✅ Deployment file exists and has correct structure.

### Frontend Files

**`frontend/src/lib/contracts.ts`:**
```typescript
vault: '0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA'
oft: '0x52Ae371913cD159070A90c0f8015C3d9af04869C'
usdc: '0xb7BB688Fc0B4d2785337d47c4b69F2Ec5ac791c9'
```

✅ Matches deployment file.

**`frontend/src/app/api/executor/route.ts`:**
```typescript
const VAULT_ADDRESS = '0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA'
```

✅ Matches deployment file.

---

## Validation of Deployed Contract

### Issue: Deployed Contract Uses Old Code

**Test performed:**
```bash
cast call 0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA \
  "depositGasless(...)" ... \
  --trace
```

**Result:**
```
├─ ecrecover(0x7da3c4be..., ...)  ← Wrong hash!
│   └─ ← [Return] 0xe01D91B... ← Wrong address!
└─ ← [Revert] InvalidSignature()
```

❌ **PROBLEM:** The deployed contract at `0xe1E4237315B1F1bdBb65a7BF9638b32780a559fA` is computing a **different message hash** than expected.

**Expected behavior (after fix):**
- Frontend creates message: `"11155111,depositGasless,0x73d1770e...,1000000,0"`
- Contract should compute: `keccak256("11155111,depositGasless,0x73d1770e...,1000000,0")`
- Message hash: `0xafab654e...`

**Actual behavior (deployed contract):**
- Contract computes different hash: `0x7da3c4be...`
- This suggests the contract is using **old bytecode** (custom assembly format)

---

## Root Cause Analysis

### Why is the deployed contract using old code?

**Hypothesis:** The deployment was done BEFORE the contract fixes were applied.

**Evidence:**
1. `VaultEVVM.sol` was updated to use standard EVVM format
2. Frontend was updated to use `@evvm/viem-signature-library`
3. But deployed contract still uses old assembly-based verification

**Timeline:**
1. ✅ Contract code fixed in `blockchain/src/VaultEVVM.sol`
2. ✅ Frontend code fixed in `frontend/src/lib/gasless.ts`
3. ❓ Contract was deployed (before or after fixes?)
4. ✅ `make frontend-setup` was run (addresses updated correctly)

**Conclusion:** The deployment used **cached or pre-fix bytecode**.

---

## The Complete Workflow (What SHOULD Happen)

### Step 1: Make Changes
```bash
# Edit contract
vim blockchain/src/VaultEVVM.sol

# Edit frontend
vim frontend/src/lib/gasless.ts
```

### Step 2: Clean and Build
```bash
cd blockchain
forge clean  # ← CRITICAL: Clears cached bytecode
forge build  # ← Compiles fresh code
```

### Step 3: Deploy
```bash
cd blockchain
./deploy-full.sh
```

This will:
- ✅ Deploy NEW contract with FIXED code
- ✅ Save addresses to `deployments/sepolia-complete.json`
- ✅ Configure gasless mode
- ✅ Set executor

### Step 4: Update Frontend
```bash
cd .. # Back to root
make frontend-setup
```

This will:
- ✅ Extract ABIs from NEW compiled artifacts
- ✅ Update `frontend/src/lib/contracts.ts` with NEW addresses
- ✅ Update `frontend/src/app/api/executor/route.ts` with NEW vault address

### Step 5: Test
```bash
cd frontend
npm run dev
```

Then test gasless deposit in the UI.

---

## Issues Found & Recommendations

### Issue 1: No Automatic Frontend Update After Deployment

**Problem:** `deploy-full.sh` doesn't call `make frontend-setup` automatically.

**Fix:** Add to end of `deploy-full.sh`:
```bash
# ========== STEP 6: Update Frontend ==========
print_step "Updating Frontend Configuration"
cd ..
make frontend-setup
cd blockchain
```

**Workaround:** Manually run `make frontend-setup` after deployment.

### Issue 2: No Forge Clean Before Deployment

**Problem:** `deploy-full.sh` doesn't run `forge clean` before deploying.

**Risk:** Can deploy **old cached bytecode** even after code changes.

**Fix:** Add to beginning of `deploy-full.sh`:
```bash
print_step "Cleaning Build Artifacts"
forge clean
forge build
```

**Workaround:** Manually run `forge clean && forge build` before deploying.

### Issue 3: No ABI Update in Deployment File

**Problem:** The deployment JSON files don't include the contract ABIs.

**Impact:** External tools need to manually import ABIs from `frontend/src/lib/abis/`.

**Recommendation:** Not critical, but could enhance `sepolia-complete.json` to include ABI references.

---

## Recommended Deployment Workflow

### For Fresh Deployment:

```bash
# 1. Clean everything
cd blockchain
forge clean

# 2. Build fresh
forge build

# 3. Deploy
./deploy-full.sh

# 4. Update frontend
cd ..
make frontend-setup

# 5. Verify deployment
cast call <VAULT_ADDRESS> "gaslessEnabled()(bool)" --rpc-url sepolia
cast call <VAULT_ADDRESS> "executor()(address)" --rpc-url sepolia

# 6. Test in UI
cd frontend
npm run dev
```

### For Redeployment After Code Changes:

```bash
# CRITICAL: Clean before redeploying!
cd blockchain
forge clean
forge build

# Deploy fresh contracts
./deploy-full.sh

# Update frontend automatically
cd ..
make frontend-setup

# Restart frontend
cd frontend
npm run dev
```

---

## Validation Checklist

After deployment, verify:

- [ ] `blockchain/deployments/sepolia-complete.json` exists
- [ ] All addresses in JSON are valid (start with `0x`, 42 chars)
- [ ] `frontend/src/lib/contracts.ts` matches JSON addresses
- [ ] `frontend/src/app/api/executor/route.ts` matches vault address
- [ ] ABIs exist in `frontend/src/lib/abis/`:
  - [ ] `VaultEVVM.abi.json`
  - [ ] `YieldFlowOFTEVVM.abi.json`
  - [ ] `MockERC20.abi.json`
- [ ] Contract on-chain has gasless enabled:
  ```bash
  cast call $VAULT "gaslessEnabled()(bool)" --rpc-url sepolia
  # Should return: true
  ```
- [ ] Contract has correct executor:
  ```bash
  cast call $VAULT "executor()(address)" --rpc-url sepolia
  # Should return executor address
  ```
- [ ] Test signature manually:
  ```bash
  # Message: "<chainId>,depositGasless,<user>,<amount>,<nonce>"
  cast wallet verify --address $USER "$MESSAGE" $SIGNATURE
  # Should succeed
  ```

---

## Current Action Required

**To fix the gasless deposit issue:**

1. **Clean and rebuild:**
   ```bash
   cd blockchain
   forge clean
   forge build
   ```

2. **Redeploy:**
   ```bash
   ./deploy-full.sh
   ```

3. **Update frontend:**
   ```bash
   cd ..
   make frontend-setup
   ```

4. **Test:**
   ```bash
   cd frontend
   npm run dev
   # Try gasless deposit - should work now!
   ```

---

## Summary

✅ **What's Working:**
- Deployment script structure is solid
- Frontend setup Makefile targets work correctly
- JSON files are being created properly
- Contract addresses are being updated correctly

❌ **What's Broken:**
- Deployed contract uses old bytecode (before fixes were applied)
- No automatic `forge clean` in deployment process
- No automatic frontend update after deployment

🔧 **Quick Fix:**
```bash
cd blockchain && forge clean && forge build && ./deploy-full.sh && cd .. && make frontend-setup
```

This will redeploy with fresh bytecode and update the frontend automatically.
