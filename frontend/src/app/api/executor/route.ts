/**
 * EVVM Executor Service API
 *
 * This endpoint receives gasless deposit requests from users and executes them
 * via EVVM.executeWithAsyncNonce(), paying gas on behalf of the user.
 *
 * Flow:
 * 1. User signs deposit message (free)
 * 2. User POSTs signature to this endpoint (free)
 * 3. Executor validates signature
 * 4. Executor calls EVVM.executeWithAsyncNonce() (executor pays gas)
 * 5. EVVM calls vault.depositGasless() (user pays 0 gas!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, encodeFunctionData, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// Import ABIs
const VaultABI = require('@/lib/abis/VaultEVVM.abi.json');

// Executor configuration
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
// Use public RPC endpoints that don't require API keys for server-side calls
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

// Contract addresses (updated from deployment)
const VAULT_ADDRESS = '0x4dcBa47fE89A8AEfC1Af3eCD37a468aB9527a843' as `0x${string}`;
const EVVM_ADDRESS = '0x9902984d86059234c3B6e11D5eAEC55f9627dD0f' as `0x${string}`;

// EVVM ABI (minimal - just what we need)
const EVVM_ABI = [
  {
    name: 'executeWithAsyncNonce',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

interface DepositRequest {
  user: `0x${string}`;
  amount: string;
  nonce: string;
  signature: `0x${string}`;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body: DepositRequest = await request.json();
    const { user, amount, nonce, signature } = body;

    console.log('Executor received gasless deposit request:', {
      user,
      amount,
      nonce,
    });

    // Validate executor key
    if (!EXECUTOR_PRIVATE_KEY) {
      console.error('❌ EXECUTOR_PRIVATE_KEY not set in environment variables');
      return NextResponse.json(
        {
          error: 'Executor not configured',
          message: 'Please add EXECUTOR_PRIVATE_KEY to your .env.local file',
          instructions: [
            '1. Generate a new wallet or use an existing one',
            '2. Add "EXECUTOR_PRIVATE_KEY=0x..." to frontend/.env.local',
            '3. Fund the executor wallet with Sepolia ETH',
            '4. Restart the dev server'
          ]
        },
        { status: 500 }
      );
    }

    // Validate private key format
    if (!EXECUTOR_PRIVATE_KEY.startsWith('0x') || EXECUTOR_PRIVATE_KEY.length !== 66) {
      console.error('❌ Invalid EXECUTOR_PRIVATE_KEY format');
      return NextResponse.json(
        {
          error: 'Invalid executor key format',
          message: 'Private key must start with 0x and be 66 characters long'
        },
        { status: 500 }
      );
    }

    // Create executor wallet
    const executorAccount = privateKeyToAccount(EXECUTOR_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account: executorAccount,
      chain: sepolia,
      transport: http(RPC_URL),
    });

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });

    console.log('Executor address:', executorAccount.address);

    // Get current nonce to avoid "already known" errors
    const currentNonce = await publicClient.getTransactionCount({
      address: executorAccount.address,
      blockTag: 'pending',
    });
    console.log('Executor nonce:', currentNonce);

    // Encode the depositGasless call
    const depositCalldata = encodeFunctionData({
      abi: VaultABI,
      functionName: 'depositGasless',
      args: [user, BigInt(amount), BigInt(nonce), signature],
    });

    console.log('Encoded depositGasless calldata:', depositCalldata);

    // Execute depositGasless DIRECTLY on vault (executor pays gas, user pays 0!)
    // Note: We call the vault directly instead of through EVVM
    // because EVVM.executeWithAsyncNonce requires special setup
    const txHash = await walletClient.writeContract({
      address: VAULT_ADDRESS,
      abi: VaultABI,
      functionName: 'depositGasless',
      args: [user, BigInt(amount), BigInt(nonce), signature],
      gas: 500000n,
      nonce: currentNonce, // Use fetched nonce to avoid duplicates
    });

    console.log('Direct vault depositGasless transaction sent:', txHash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    console.log('Transaction confirmed:', {
      hash: txHash,
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
    });

    // Check if transaction reverted
    if (receipt.status === 'reverted') {
      console.error('❌ Transaction reverted!');

      // Try to get revert reason
      let revertReason = 'Transaction reverted';
      try {
        // Simulate the transaction to get revert reason
        await publicClient.simulateContract({
          address: VAULT_ADDRESS,
          abi: VaultABI,
          functionName: 'depositGasless',
          args: [user, BigInt(amount), BigInt(nonce), signature],
          account: executorAccount.address,
        });
      } catch (simulateError: any) {
        revertReason = simulateError.shortMessage || simulateError.message || 'Transaction reverted';
        console.error('Revert reason:', revertReason);
      }

      return NextResponse.json(
        {
          error: 'Transaction reverted',
          message: revertReason,
          txHash,
          details: 'The transaction was executed but reverted on-chain. Check if gasless mode is enabled and signatures are valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash,
      gasUsed: receipt.gasUsed.toString(),
      message: 'Deposit executed gaslessly! User paid 0 gas.',
    });
  } catch (error: any) {
    console.error('Executor error:', error);
    return NextResponse.json(
      {
        error: 'Execution failed',
        message: error.message,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
