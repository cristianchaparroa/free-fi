# Gasless Deposit Debugging Log

## Problem Statement
Gasless deposit transactions were failing with `InvalidSignature()` error despite seemingly correct signature construction.

## Timeline of Attempts

### Attempt 1: Using `encodePacked` with `'bytes'` type
**What we tried:** Used viem's `encodePacked` with `['bytes', 'address', 'uint256', ...]` types.

**Why it failed:** The `'bytes'` type in `encodePacked` includes length encoding, which doesn't match the contract's assembly `mstore` behavior.

**Message hash produced:** `0x84650d8c6710642ddd4f790c3b0e0da51074666df3e4e7c8fb841ec82d4ca91c`

---

### Attempt 2: Using `encodePacked` with `'string'` type
**What we tried:** Changed to `encodePacked` with `['string', 'address', 'uint256', ...]` types.

**Why it failed:** While `'string'` encodes UTF-8 bytes directly, `encodePacked` creates compact encoding (160 bytes) without word-alignment padding. The contract's assembly uses `mstore` which creates 32-byte aligned words (172 bytes total).

**Key insight:** `encodePacked` != assembly `mstore` layout

---

### Attempt 3: Manual buffer construction with word alignment
**What we tried:** Manually constructed a 172-byte buffer to match the assembly's `mstore` operations:
```typescript
const buffer = new Uint8Array(0xac); // 172 bytes

// mstore(ptr, "VaultEVVM.depositGasless") - 32-byte word
const functionBytes = new TextEncoder().encode(functionString);
buffer.set(functionBytes, 0);

// mstore(add(ptr, 0x18), shl(96, user)) - 32-byte word at offset 24
const userHex = user.slice(2).toLowerCase().padStart(64, '0');
const userBytes = userHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16));
buffer.set(userBytes, 0x18);

// mstore(add(ptr, 0x2c), amount) - 32-byte word at offset 44
// ... and so on
```

**Result:** Successfully produced the correct message hash: `0x07d0a035505aed81e38072ddddc9ddecb023ed308197014e62e145e1c5e89558`

**Signature validation:** `cast wallet verify` confirmed the signature is valid for this hash.

---

### Attempt 4: On-chain simulation revealed the root cause
**What we found:** Used `cast call --trace` to see exactly what the contract was computing:

```
[14628] VaultEVVM::depositGasless(...)
    ├─ [3000] PRECOMPILES::ecrecover(0x7d90e89b3e6c4453272bd3340a940e7568d8323597b796ab4d9f29b4a67b771f, ...)
    │   └─ ← [Return] 0xf35FC2Df9A0f2b21e5c697E5A6123dd19ECBf2ef
    └─ ← [Revert] InvalidSignature()
```

**Critical discovery:**
- Contract computed ethSignedMessageHash: `0x7d90e89b3e6c4453272bd3340a940e7568d8323597b796ab4d9f29b4a67b771f`
- Frontend computed ethSignedMessageHash: `0x07d0a035...` (different!)
- Recovered address: `0xf35FC2Df9A0f2b21e5c697E5A6123dd19ECBf2ef`
- Expected address: `0x73D1770E68636029Cfa3F3eb9c050fc85D063b0d`

The contract is computing a **completely different message hash** than what we're signing!

---

## Root Cause Analysis

### Contract Design Issue
The `VaultEVVM.sol` contract uses a **custom assembly-based message hash format** that is **NOT compatible with the standard EVVM signature format**.

**Contract's assembly code (lines 196-205):**
```solidity
assembly {
    let ptr := mload(0x40)
    mstore(ptr, "VaultEVVM.depositGasless")
    mstore(add(ptr, 0x18), shl(96, user))
    mstore(add(ptr, 0x2c), amount)
    mstore(add(ptr, 0x4c), nonce)
    mstore(add(ptr, 0x6c), chainid())
    mstore(add(ptr, 0x8c), address())
    messageHash := keccak256(ptr, 0xac)
}
bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
address signer = ethSignedMessageHash.recover(signature);
```

**Standard EVVM format** (used by `@evvm/viem-signature-library`):
```
"<evvmID>,<functionName>,<param1>,<param2>,...,<paramN>"
```

### Why This Is A Problem
1. **Incompatible with EVVM ecosystem:** The EVVM signature library and all EVVM examples use the standard comma-separated format.
2. **Custom implementation required:** Frontends must implement custom signature logic that won't work with any other EVVM contracts.
3. **No standard tooling:** Cannot use `@evvm/viem-signature-library` or the EVVM Signature Constructor tool.

---

## Comparison: Custom vs Standard EVVM Format

### Custom Assembly Format (Current Implementation)
**Buffer structure (172 bytes):**
```
[0-31]     : "VaultEVVM.depositGasless" + padding
[24-55]    : 0x000...user_address (32-byte word, overlaps prev)
[44-75]    : amount (32-byte uint256, overlaps prev)
[76-107]   : nonce (32-byte uint256)
[108-139]  : chainId (32-byte uint256)
[140-171]  : 0x000...vault_address (32-byte word)
```

**Pros:**
- Slightly more gas efficient (no string parsing)

**Cons:**
- Not compatible with EVVM standards
- Requires custom frontend implementation
- Cannot use existing EVVM tools
- More complex to implement correctly

### Standard EVVM Format (What Should Be Used)
**Message structure:**
```
"<evvmID>,depositGasless,<user>,<amount>,<nonce>"
```

**Pros:**
- Compatible with `@evvm/viem-signature-library`
- Works with EVVM Signature Constructor tool
- Standard across EVVM ecosystem
- Easier to implement and verify

**Cons:**
- Slightly more gas (string operations)

---

## Current Status

### What Works
✅ Message hash construction matches assembly layout
✅ Signature is cryptographically valid (verified with `cast wallet verify`)
✅ Nonce, allowance, and balance checks pass

### What Doesn't Work
❌ Contract computes a different hash at runtime
❌ Signature verification fails with `InvalidSignature()`
❌ Root cause: Contract's hash computation differs from our construction

---

## Recommended Solutions

### Option 1: Fix the Contract (Recommended)
Rewrite `depositGasless` to use standard EVVM message format:

```solidity
function depositGasless(address user, uint256 amount, uint256 nonce, bytes calldata signature)
    external
    nonReentrant
    returns (uint256 shares)
{
    if (!gaslessEnabled) revert GaslessDisabled();
    if (amount < MIN_DEPOSIT) revert AmountTooSmall();
    if (nonce != userNonces[user]) revert InvalidNonce();

    // Build standard EVVM message: "<evvmID>,depositGasless,<user>,<amount>,<nonce>"
    string memory message = string(abi.encodePacked(
        Strings.toString(block.chainid),
        ",depositGasless,",
        Strings.toHexString(uint160(user), 20),
        ",",
        Strings.toString(amount),
        ",",
        Strings.toString(nonce)
    ));

    bytes32 messageHash = keccak256(bytes(message));
    bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
    address signer = ethSignedMessageHash.recover(signature);

    if (signer != user) revert InvalidSignature();

    // ... rest of the function
}
```

**Then use standard EVVM library in frontend:**
```typescript
import { EVVMSignatureBuilder } from '@evvm/viem-signature-library';

const signatureBuilder = new EVVMSignatureBuilder(walletClient, account);
const signature = await signatureBuilder.signGenericMessage(
  BigInt(chainId),
  'depositGasless',
  `${user.toLowerCase()},${amount},${nonce}`
);
```

### Option 2: Debug Why Hashes Don't Match (Complex)
The contract is computing `0x7d90e89b...` but we expect `0x07d0a035...`. We need to:
1. Add debug events to log what the contract computes
2. Compare byte-by-byte with frontend construction
3. Find the exact discrepancy

This is time-consuming and may reveal subtle bugs in either implementation.

### Option 3: Use Direct EVVM Integration (If Available)
If EVVM provides a standard `executeWithAsyncNonce` function, use that instead of custom signature verification:

```solidity
EVVM.executeWithAsyncNonce(
    address(this),
    abi.encodeWithSelector(this.deposit.selector, amount),
    nonce
);
```

---

## Files Modified

1. **`frontend/src/lib/gasless.ts`**
   - Rewrote `signDepositMessage` to manually construct 172-byte buffer
   - Matches assembly's `mstore` memory layout
   - Produces correct hash `0x07d0a035...`

2. **Test scripts created:**
   - `test-signature.js` - Initial encodePacked test
   - `test-contract-assembly.js` - Assembly emulation (had bugs)
   - `correct-assembly-emulation.js` - Fixed assembly emulation
   - `verify-new-implementation.js` - Verifies TypeScript matches assembly
   - `compare-buffers.js` - Byte-by-byte comparison
   - `debug-contract-hash.js` - Confirms frontend hash is correct

---

## Key Learnings

1. **`encodePacked` ≠ assembly `mstore`**
   - `encodePacked` creates compact encoding
   - `mstore` creates word-aligned (32-byte) encoding
   - They produce different results!

2. **`mstore` operations can overlap**
   - Writing at offset 0x18 affects bytes 24-55
   - Writing at offset 0x2c affects bytes 44-75
   - Bytes 44-55 are overwritten by the later operation

3. **EIP-191 is applied at multiple layers**
   - Frontend: `signMessage({ raw: hash })` adds EIP-191 prefix
   - Contract: `messageHash.toEthSignedMessageHash()` adds EIP-191 prefix
   - Both must match for recovery to work

4. **On-chain simulation is crucial**
   - `cast call --trace` revealed the actual hash being computed
   - Off-chain testing can't catch runtime differences
   - Always verify with actual contract calls

---

## References

- [EVVM Documentation](https://www.evvm.info/docs/SignatureStructures/)
- [EVVM Signature Library](https://github.com/EVVM-org/EVVM_ts_library)
- [EVVM Signature Constructor Front](~/hackathon/EVVM-Signature-Constructor-Front)
- [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [OpenZeppelin ECDSA Library](https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA)

---

## Conclusion

The gasless deposit functionality is currently **blocked** because the contract uses a non-standard signature format that computes a different message hash than what we're signing.

**Immediate next step:** Choose one of the recommended solutions above. Option 1 (fixing the contract to use standard EVVM format) is strongly recommended for long-term maintainability and ecosystem compatibility.
