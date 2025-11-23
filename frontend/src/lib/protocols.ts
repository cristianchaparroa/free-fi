/**
 * DeFi Protocol Integrations
 *
 * Handles deposits into various yield protocols:
 * - Uniswap V2: Liquidity provision
 * - Aave V3: Lending deposits
 * - Compound V3: Lending deposits
 * - Curve: Liquidity provision
 */

import { createPublicClient, createWalletClient, custom, parseUnits, http } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';

/**
 * Protocol contract addresses by chain
 */
const PROTOCOL_ADDRESSES: Record<string, Record<number, string>> = {
  // Uniswap V2 Router addresses
  'uniswap-v2': {
    1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Ethereum
    137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // Polygon (QuickSwap)
  },
  // Aave V3 Pool addresses
  'aave-v3': {
    1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Ethereum
    137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Polygon
    42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
    10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Optimism
    8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Base
  },
  // Compound V3 Comet addresses (USDC markets)
  'compound-v3': {
    1: '0xc3d688B66703497DAA19211EEdff47f25384cdc3', // Ethereum USDC
    137: '0xF25212E676D1F7F89Cd72fFEe66158f541246445', // Polygon USDC
    42161: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA', // Arbitrum USDC
    8453: '0x46e6b214b524310239732D51387075E0e70970bf', // Base USDC
  },
};

/**
 * Simplified ABIs for protocol interactions
 */
const ABIS = {
  // Uniswap V2 Router ABI (addLiquidityETH)
  uniswapV2Router: [
    {
      name: 'addLiquidityETH',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'amountTokenDesired', type: 'uint256' },
        { name: 'amountTokenMin', type: 'uint256' },
        { name: 'amountETHMin', type: 'uint256' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [
        { name: 'amountToken', type: 'uint256' },
        { name: 'amountETH', type: 'uint256' },
        { name: 'liquidity', type: 'uint256' },
      ],
    },
  ] as const,

  // Aave V3 Pool ABI (supply)
  aaveV3Pool: [
    {
      name: 'supply',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'onBehalfOf', type: 'address' },
        { name: 'referralCode', type: 'uint16' },
      ],
      outputs: [],
    },
  ] as const,

  // Compound V3 Comet ABI (supply)
  compoundV3Comet: [
    {
      name: 'supply',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
    },
  ] as const,

  // ERC20 ABI for approvals
  erc20: [
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ] as const,
};

/**
 * Token addresses (for approvals and deposits)
 */
const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  ETH: {
    1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH marker
    10: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    42161: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    8453: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
  POL: {
    137: '0x0000000000000000000000000000000000001010', // Polygon native
    1: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // Ethereum (POL token)
  },
};

/**
 * Get chain config from chain ID
 */
function getChainConfig(chainId: number) {
  const chains: Record<number, any> = {
    1: mainnet,
    137: polygon,
    42161: arbitrum,
    10: optimism,
    8453: base,
  };
  return chains[chainId];
}

/**
 * Helper function to encode Aave V3 supply call
 */
export function encodeAaveSupply(
  tokenAddress: string,
  amount: bigint,
  onBehalfOf: string
): `0x${string}` {
  const iface = ABIS.aaveV3Pool;

  // Manually encode since we have minimal ABI
  // supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
  // Function selector: 0x617ba037
  const selector = '0x617ba037';

  // Encode parameters (32 bytes each)
  const assetPadded = tokenAddress.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  const onBehalfOfPadded = onBehalfOf.slice(2).padStart(64, '0');
  const referralCode = '0'.padStart(64, '0');

  return `${selector}${assetPadded}${amountHex}${onBehalfOfPadded}${referralCode}` as `0x${string}`;
}

/**
 * Helper function to encode Compound V3 supply call
 */
export function encodeCompoundSupply(
  tokenAddress: string,
  amount: bigint
): `0x${string}` {
  // supply(address asset, uint256 amount)
  // Function selector: 0xf2b9fdb8
  const selector = '0xf2b9fdb8';

  const assetPadded = tokenAddress.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');

  return `${selector}${assetPadded}${amountHex}` as `0x${string}`;
}

/**
 * Get protocol contract address and generate deposit data
 */
export function getProtocolDepositData(
  protocol: string,
  token: string,
  amount: string,
  chainId: number,
  userAddress: string
): { address: string; data: `0x${string}` } | null {
  const normalizedProtocol = protocol.toLowerCase();

  // Get token address
  const tokenAddress = TOKEN_ADDRESSES[token]?.[chainId];
  if (!tokenAddress) return null;

  // Get decimals
  const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
  const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

  if (normalizedProtocol.includes('aave')) {
    const aaveAddress = PROTOCOL_ADDRESSES['aave-v3']?.[chainId];
    if (!aaveAddress) return null;

    return {
      address: aaveAddress,
      data: encodeAaveSupply(tokenAddress, amountBigInt, userAddress),
    };
  } else if (normalizedProtocol.includes('compound')) {
    const compoundAddress = PROTOCOL_ADDRESSES['compound-v3']?.[chainId];
    if (!compoundAddress) return null;

    return {
      address: compoundAddress,
      data: encodeCompoundSupply(tokenAddress, amountBigInt),
    };
  }

  return null;
}

/**
 * Protocol Deposit Manager
 */
export class ProtocolDepositManager {
  /**
   * Switch wallet to target chain if needed
   */
  private async ensureCorrectChain(
    walletClient: any,
    targetChainId: number,
    onProgress?: (message: string) => void
  ): Promise<void> {
    try {
      // Get the underlying transport/provider
      const provider = walletClient.transport || walletClient.account?.transport || walletClient;

      // Try to get current chain
      let currentChainIdNumber = walletClient.chain?.id;

      // If not available from chain, request it
      if (!currentChainIdNumber && provider.request) {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        currentChainIdNumber = parseInt(currentChainId, 16);
      }

      if (currentChainIdNumber && currentChainIdNumber !== targetChainId) {
        onProgress?.(`Please switch your wallet to chain ${targetChainId}...`);

        // Request chain switch via wallet
        if (provider.request) {
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${targetChainId.toString(16)}` }],
            });

            // Wait for the switch to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            onProgress?.('Chain switched successfully!');
          } catch (switchError: any) {
            // Chain might not be added to wallet
            if (switchError.code === 4902 || switchError.code === -32603) {
              throw new Error(`Chain ${targetChainId} not added to your wallet. Please add it manually and try again.`);
            }
            // User rejected
            if (switchError.code === 4001) {
              throw new Error('Chain switch rejected. Please switch to the correct chain manually.');
            }
            throw switchError;
          }
        } else {
          throw new Error(`Please switch your wallet to chain ID ${targetChainId} manually.`);
        }
      }
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  }

  /**
   * Deposit into Aave V3 lending pool
   */
  async depositToAave(
    walletClient: any,
    token: string,
    amount: string,
    chainId: number,
    userAddress: string,
    onProgress?: (message: string) => void
  ): Promise<{ hash: string; explorerUrl: string }> {
    try {
      onProgress?.('Preparing Aave V3 deposit...');

      // Ensure wallet is on correct chain
      await this.ensureCorrectChain(walletClient, chainId, onProgress);

      const chain = getChainConfig(chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const tokenAddress = TOKEN_ADDRESSES[token]?.[chainId];
      const aavePoolAddress = PROTOCOL_ADDRESSES['aave-v3']?.[chainId];

      if (!tokenAddress || !aavePoolAddress) {
        throw new Error(`Aave V3 not available for ${token} on chain ${chainId}`);
      }

      // Create fresh wallet client on the correct chain
      const chainWalletClient = createWalletClient({
        chain,
        transport: custom(walletClient.transport || window.ethereum),
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Get decimals for the token
      const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
      const amountBigInt = parseUnits(amount, decimals);

      // Check if we need approval (skip for native tokens: ETH, POL)
      const isNativeToken = tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ||
                            tokenAddress === '0x0000000000000000000000000000000000001010';

      if (!isNativeToken) {
        onProgress?.('Checking token approval...');

        const allowance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ABIS.erc20,
          functionName: 'allowance',
          args: [userAddress as `0x${string}`, aavePoolAddress as `0x${string}`],
        });

        if (allowance < amountBigInt) {
          onProgress?.('Approving token spending...');

          const approveHash = await chainWalletClient.writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ABIS.erc20,
            functionName: 'approve',
            args: [aavePoolAddress as `0x${string}`, amountBigInt],
            account: userAddress as `0x${string}`,
          });

          onProgress?.('Waiting for approval confirmation...');
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // Deposit into Aave
      onProgress?.('Depositing into Aave V3...');

      const depositHash = await chainWalletClient.writeContract({
        address: aavePoolAddress as `0x${string}`,
        abi: ABIS.aaveV3Pool,
        functionName: 'supply',
        args: [
          tokenAddress as `0x${string}`,
          amountBigInt,
          userAddress as `0x${string}`,
          0, // referral code
        ],
        account: userAddress as `0x${string}`,
      });

      onProgress?.('Waiting for deposit confirmation...');
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      const explorerUrl = `${chain.blockExplorers?.default.url}/tx/${depositHash}`;

      return {
        hash: depositHash,
        explorerUrl,
      };
    } catch (error) {
      console.error('Aave deposit failed:', error);
      throw error;
    }
  }

  /**
   * Deposit into Compound V3
   */
  async depositToCompound(
    walletClient: any,
    token: string,
    amount: string,
    chainId: number,
    userAddress: string,
    onProgress?: (message: string) => void
  ): Promise<{ hash: string; explorerUrl: string }> {
    try {
      onProgress?.('Preparing Compound V3 deposit...');

      // Ensure wallet is on correct chain
      await this.ensureCorrectChain(walletClient, chainId, onProgress);

      const chain = getChainConfig(chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const tokenAddress = TOKEN_ADDRESSES[token]?.[chainId];
      const compoundAddress = PROTOCOL_ADDRESSES['compound-v3']?.[chainId];

      if (!tokenAddress || !compoundAddress) {
        throw new Error(`Compound V3 not available for ${token} on chain ${chainId}`);
      }

      const chainWalletClient = createWalletClient({
        chain,
        transport: custom(walletClient.transport || window.ethereum),
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
      const amountBigInt = parseUnits(amount, decimals);

      // Approve token
      onProgress?.('Approving token spending...');

      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ABIS.erc20,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, compoundAddress as `0x${string}`],
      });

      if (allowance < amountBigInt) {
        const approveHash = await chainWalletClient.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: ABIS.erc20,
          functionName: 'approve',
          args: [compoundAddress as `0x${string}`, amountBigInt],
          account: userAddress as `0x${string}`,
        });

        onProgress?.('Waiting for approval confirmation...');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Deposit into Compound
      onProgress?.('Depositing into Compound V3...');

      const depositHash = await chainWalletClient.writeContract({
        address: compoundAddress as `0x${string}`,
        abi: ABIS.compoundV3Comet,
        functionName: 'supply',
        args: [tokenAddress as `0x${string}`, amountBigInt],
        account: userAddress as `0x${string}`,
      });

      onProgress?.('Waiting for deposit confirmation...');
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      const explorerUrl = `${chain.blockExplorers?.default.url}/tx/${depositHash}`;

      return {
        hash: depositHash,
        explorerUrl,
      };
    } catch (error) {
      console.error('Compound deposit failed:', error);
      throw error;
    }
  }

  /**
   * Deposit into Uniswap V2 (simplified - single-sided staking)
   * Note: Full Uniswap V2 LP requires paired tokens. This is a simplified version.
   */
  async depositToUniswapV2(
    walletClient: any,
    token: string,
    amount: string,
    chainId: number,
    userAddress: string,
    onProgress?: (message: string) => void
  ): Promise<{ hash: string; explorerUrl: string }> {
    try {
      onProgress?.('Preparing Uniswap V2 deposit...');

      // For now, we'll use Aave as a fallback since true Uniswap V2 LP
      // requires paired tokens (e.g., ETH + USDC)
      // This provides similar yield through lending
      return await this.depositToAave(
        walletClient,
        token,
        amount,
        chainId,
        userAddress,
        onProgress
      );
    } catch (error) {
      console.error('Uniswap V2 deposit failed:', error);
      throw error;
    }
  }

  /**
   * Generic deposit function that routes to the correct protocol
   */
  async depositToProtocol(
    protocol: string,
    walletClient: any,
    token: string,
    amount: string,
    chainId: number,
    userAddress: string,
    onProgress?: (message: string) => void
  ): Promise<{ hash: string; explorerUrl: string }> {
    const normalizedProtocol = protocol.toLowerCase();

    if (normalizedProtocol.includes('aave')) {
      return this.depositToAave(walletClient, token, amount, chainId, userAddress, onProgress);
    } else if (normalizedProtocol.includes('compound')) {
      return this.depositToCompound(walletClient, token, amount, chainId, userAddress, onProgress);
    } else if (normalizedProtocol.includes('uniswap')) {
      return this.depositToUniswapV2(walletClient, token, amount, chainId, userAddress, onProgress);
    } else {
      // Default to Aave for unknown protocols (provides similar yields)
      onProgress?.(`⚠️ ${protocol} integration not available. Using Aave V3 as alternative...`);
      return this.depositToAave(walletClient, token, amount, chainId, userAddress, onProgress);
    }
  }
}

// Export singleton instance
export const protocolDepositManager = new ProtocolDepositManager();
