/**
 * Avail Nexus Integration for FreeFi
 *
 * Simplified cross-chain yield optimization using Avail Nexus SDK.
 * Handles:
 * - Cross-chain bridges and swaps
 * - Unified balance retrieval
 * - Yield opportunity deployment
 * - Protocol deposits (Aave, Compound, Uniswap, etc.)
 */

import { NexusSDK, NEXUS_EVENTS } from '@avail-project/nexus-core';
import { protocolDepositManager } from './protocols';

export interface YieldOpportunity {
  protocol: string;
  chain: string;
  chainId: number;
  token: 'USDC' | 'USDT' | 'ETH' | 'POL';
  apy: number;
  tvl: number;
  riskScore: number; // 1-10
}

/**
 * Token addresses for mainnet chains
 * Source: https://docs.availproject.org/nexus/avail-nexus-sdk/supported-tokens
 */
const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  // ETH is native on most chains - use special marker
  ETH: {
    1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Ethereum
    10: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Optimism
    137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon (wrapped ETH)
    42161: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Arbitrum
    8453: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Base
  },
  // USDC addresses per chain
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  },
  // USDT addresses per chain
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // Base
  },
  // POL (Polygon native token) - previously MATIC
  POL: {
    137: '0x0000000000000000000000000000000000001010', // Polygon native
    1: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // Ethereum (POL token)
  },
  // MATIC (legacy mapping, same as POL)
  MATIC: {
    137: '0x0000000000000000000000000000000000001010', // Polygon native
    1: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // Ethereum
  },
};

export interface UnifiedBalance {
  token: string;
  amount: string;
  chainId: number;
  chain: string;
  usdValue: number;
}

/**
 * Nexus Manager - Simplified interface to Avail Nexus SDK
 */
class NexusManager {
  private sdk: any = null;
  private initialized = false;

  /**
   * Initialize Nexus SDK with wallet provider
   *
   * Supported Networks:
   * - Mainnet: Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB, Scroll, Sophon, Kaia, HyperEVM
   * - Testnet: Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, Polygon Amoy, Monad Testnet
   */
  async initialize(provider: any): Promise<void> {
    if (this.initialized) {
      console.log('✅ Nexus SDK already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing Nexus SDK...');
      const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE === 'testnet';
      const network = isTestnet ? 'testnet' : 'mainnet';
      console.log(`📡 Network mode: ${network}`);

      this.sdk = new NexusSDK({ network });

      // Try to initialize - this might fail on unsupported chains
      await this.sdk.initialize(provider);

      // Only set hooks if initialization was successful
      if (this.sdk && typeof this.sdk.setOnAllowanceHook === 'function') {
        // Set up approval hook to automatically approve max amount
        this.sdk.setOnAllowanceHook(({ sources, allow }: any) => {
          console.log('🔐 Approval requested for:', sources);
          // Approve max amount for better UX (user will still confirm in wallet)
          allow(['max']);
        });
      }

      if (this.sdk && typeof this.sdk.setOnIntentHook === 'function') {
        // Set up intent hook for transaction confirmations
        this.sdk.setOnIntentHook(({ intent, approve }: any) => {
          console.log('📝 Intent requested:', intent);
          // Auto-approve intent (user still confirms in wallet)
          approve();
        });
      }

      this.initialized = true;
      console.log('✅ Nexus SDK initialized successfully with approval hooks');
    } catch (error) {
      console.error('❌ Failed to initialize Nexus SDK:', error);
      console.warn('⚠️ App will continue without Nexus SDK');
      // Don't throw - let app continue
      this.initialized = false;
      this.sdk = null;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.sdk !== null;
  }

  /**
   * Get unified balances across all chains
   */
  async getUnifiedBalances(includeSwappable: boolean = false): Promise<UnifiedBalance[]> {
    if (!this.sdk || !this.initialized) {
      console.warn('Nexus SDK not initialized');
      return []; // Return empty array instead of throwing
    }

    try {
      const rawBalances = await this.sdk.getUnifiedBalances(includeSwappable);

      // Transform Nexus SDK format to our format
      return rawBalances.map((balance: any) => ({
        token: balance.symbol || balance.token || 'UNKNOWN',
        amount: balance.balance || '0',
        chainId: balance.chainId || 0,
        chain: balance.chain || 'Unknown Chain',
        usdValue: balance.balanceInFiat ? parseFloat(balance.balanceInFiat) : 0,
        // Keep original data for reference
        ...balance
      }));
    } catch (error) {
      console.error('Failed to get unified balances:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Bridge tokens to target chain using Nexus SDK
   */
  async bridgeToChain(
    token: string,
    amount: string,
    sourceChainId: number,
    targetChainId: number,
    onProgress?: (step: any) => void
  ): Promise<any> {
    if (!this.sdk) {
      throw new Error('Nexus SDK not initialized. Please connect your wallet.');
    }

    try {
      console.log(`🌉 Starting bridge: ${amount} ${token} from chain ${sourceChainId} to chain ${targetChainId}`);

      // IMPORTANT: Ensure wallet is on SOURCE chain before bridge
      if (typeof window !== 'undefined' && window.ethereum) {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainIdNumber = parseInt(currentChainId, 16);

        if (currentChainIdNumber !== sourceChainId) {
          onProgress?.({ type: 'info', message: `Please switch to source chain ${sourceChainId}...` });

          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${sourceChainId.toString(16)}` }],
            });

            // Wait for switch to complete
            await new Promise(resolve => setTimeout(resolve, 1500));
            onProgress?.({ type: 'info', message: 'Chain switched successfully!' });
          } catch (switchError: any) {
            if (switchError.code === 4001) {
              throw new Error('Please switch to the source chain to continue.');
            }
            throw switchError;
          }
        }
      }

      // Convert amount to bigint based on token decimals
      // USDC/USDT = 6 decimals, ETH/DAI = 18 decimals
      const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      const result = await this.sdk.bridge(
        {
          token,
          amount: amountBigInt,
          toChainId: targetChainId,
        },
        {
          onEvent: (event: any) => {
            console.log('📡 Bridge event:', event.name, event.args);

            if (event.name === NEXUS_EVENTS.EXPECTED_STEPS) {
              onProgress?.({ type: 'steps', steps: event.args });
            } else if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              onProgress?.({ type: 'complete', step: event.args });
            }
          },
        }
      );

      console.log('✅ Bridge successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Bridge failed:', error);
      throw error;
    }
  }

  /**
   * Bridge tokens and execute protocol deposit in ONE atomic transaction
   * This is the recommended approach using Nexus SDK's bridgeAndExecute
   */
  async bridgeAndExecute(
    token: string,
    amount: string,
    sourceChainId: number,
    targetChainId: number,
    protocolAddress: string,
    depositData: `0x${string}`,
    userAddress: string,
    onProgress?: (step: any) => void
  ): Promise<any> {
    if (!this.sdk) {
      throw new Error('Nexus SDK not initialized. Please connect your wallet.');
    }

    try {
      console.log(`🌉 Bridge and Execute: ${amount} ${token} from chain ${sourceChainId} to chain ${targetChainId}`);
      console.log(`📝 Protocol: ${protocolAddress}`);

      // Convert amount to bigint based on token decimals
      const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      const result = await this.sdk.bridgeAndExecute(
        {
          token,
          amount: amountBigInt,
          toChainId: targetChainId,
          sourceChains: [sourceChainId],
          execute: {
            to: protocolAddress,
            data: depositData,
            tokenApproval: {
              token,
              amount: amountBigInt,
            },
          },
        },
        {
          onEvent: (event: any) => {
            console.log('📡 BridgeAndExecute event:', event.name, event.args);

            if (event.name === NEXUS_EVENTS.BRIDGE_EXECUTE_EXPECTED_STEPS) {
              onProgress?.({ type: 'steps', steps: event.args });
            } else if (event.name === NEXUS_EVENTS.BRIDGE_EXECUTE_COMPLETED_STEPS) {
              onProgress?.({ type: 'complete', step: event.args });
            }
          },
        }
      );

      console.log('✅ Bridge and Execute successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Bridge and Execute failed:', error);
      throw error;
    }
  }

  /**
   * Swap and bridge in one transaction using Nexus SDK
   */
  async swapAndBridge(
    sourceToken: string,
    targetToken: string,
    amount: string,
    sourceChainId: number,
    targetChainId: number,
    onProgress?: (step: any) => void
  ): Promise<any> {
    if (!this.sdk) {
      throw new Error('Nexus SDK not initialized. Please connect your wallet.');
    }

    try {
      console.log(`🔄 Swapping ${amount} ${sourceToken} (chain ${sourceChainId}) → ${targetToken} (chain ${targetChainId})`);

      // Check if this swap is supported
      // POL/MATIC swaps are currently not well supported by Nexus SDK routing
      if ((sourceToken === 'POL' || sourceToken === 'MATIC') && targetToken !== 'POL' && targetToken !== 'MATIC') {
        throw new Error(`Direct POL→${targetToken} swap is not supported yet. Please swap POL to USDC on Polygon first using a DEX, then deploy.`);
      }

      // IMPORTANT: Ensure wallet is on SOURCE chain before swap
      // Nexus SDK needs to execute transactions on the chain where tokens are
      if (typeof window !== 'undefined' && window.ethereum) {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainIdNumber = parseInt(currentChainId, 16);

        if (currentChainIdNumber !== sourceChainId) {
          onProgress?.({ type: 'info', message: `Please switch to source chain ${sourceChainId}...` });

          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${sourceChainId.toString(16)}` }],
            });

            // Wait for switch to complete
            await new Promise(resolve => setTimeout(resolve, 1500));
            onProgress?.({ type: 'info', message: 'Chain switched successfully!' });
          } catch (switchError: any) {
            if (switchError.code === 4001) {
              throw new Error('Please switch to the source chain to continue.');
            }
            throw switchError;
          }
        }
      }

      // Get token addresses for source and target
      // Note: POL on Polygon uses MATIC address mapping for compatibility
      const sourceTokenKey = sourceToken === 'POL' ? 'MATIC' : sourceToken;
      const targetTokenKey = targetToken === 'POL' ? 'MATIC' : targetToken;

      const sourceTokenAddress = TOKEN_ADDRESSES[sourceTokenKey]?.[sourceChainId];
      const targetTokenAddress = TOKEN_ADDRESSES[targetTokenKey]?.[targetChainId];

      if (!sourceTokenAddress) {
        throw new Error(`Token address not found for ${sourceToken} on chain ${sourceChainId}`);
      }
      if (!targetTokenAddress) {
        throw new Error(`Token address not found for ${targetToken} on chain ${targetChainId}`);
      }

      console.log(`🔍 Token mapping: ${sourceToken} (${sourceChainId}) → ${sourceTokenAddress}`);
      console.log(`🔍 Token mapping: ${targetToken} (${targetChainId}) → ${targetTokenAddress}`);

      // Convert amount to bigint based on source token decimals
      // USDC/USDT = 6 decimals, all others (ETH, POL, MATIC, DAI) = 18 decimals
      const decimals = ['USDC', 'USDT'].includes(sourceToken) ? 6 : 18;
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      console.log('📝 Swap parameters:', {
        from: [{ chainId: sourceChainId, amount: amountBigInt.toString(), tokenAddress: sourceTokenAddress }],
        toChainId: targetChainId,
        toTokenAddress: targetTokenAddress,
      });

      const result = await this.sdk.swapWithExactIn(
        {
          from: [
            {
              chainId: sourceChainId,
              amount: amountBigInt,
              tokenAddress: sourceTokenAddress,
            }
          ],
          toChainId: targetChainId,
          toTokenAddress: targetTokenAddress,
        },
        {
          onEvent: (event: any) => {
            console.log('📡 Swap event:', event.name, event.args);

            if (event.name === NEXUS_EVENTS.SWAP_STEPS) {
              onProgress?.({ type: 'steps', steps: event.args });
            } else if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              onProgress?.({ type: 'complete', step: event.args });
            }
          },
        }
      );

      console.log('✅ Swap successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Swap failed:', error);
      throw error;
    }
  }

  /**
   * Deploy funds to a yield opportunity
   * Intelligently chooses between bridge or swap+bridge based on available balances
   * Then deposits into the actual protocol
   */
  async deployToOpportunity(
    opportunity: YieldOpportunity,
    amount: string,
    currentChainId: number,
    userAddress: string,
    walletClient: any,
    sourceToken?: string, // Optional: if swapping from different token
    onProgress?: (message: string, data?: any) => void
  ): Promise<any> {
    if (!this.sdk) {
      throw new Error('Nexus SDK not initialized. Please connect your wallet.');
    }

    try {
      console.log('🚀 Starting deployment:', {
        opportunity,
        amount,
        currentChainId,
        sourceToken,
      });

      const targetToken = opportunity.token;
      const targetChainId = opportunity.chainId;

      // Case 1: Need to swap from different token
      if (sourceToken && sourceToken !== targetToken) {
        onProgress?.(`Swapping ${sourceToken} → ${targetToken} and bridging to ${opportunity.chain}...`);

        const swapResult = await this.swapAndBridge(
          sourceToken,
          targetToken,
          amount,
          currentChainId, // Source chain where the user has the token
          targetChainId,  // Destination chain for the opportunity
          (event) => {
            if (event.type === 'steps') {
              onProgress?.('Swap + bridge steps initiated', event.steps);
            } else if (event.type === 'complete') {
              onProgress?.(`Step completed: ${event.step?.type || 'Processing'}`);
            }
          }
        );

        onProgress?.('Swap and bridge complete!');

        // Now deposit into the protocol
        try {
          const depositResult = await protocolDepositManager.depositToProtocol(
            opportunity.protocol,
            walletClient,
            targetToken,
            amount,
            targetChainId,
            userAddress,
            (msg) => onProgress?.(msg)
          );

          return {
            success: true,
            swapResult,
            depositResult,
            explorerUrl: depositResult.explorerUrl,
            message: `Successfully deployed to ${opportunity.protocol}! Now earning ${opportunity.apy.toFixed(2)}% APY`,
            protocol: opportunity.protocol,
            apy: opportunity.apy,
          };
        } catch (depositError: any) {
          console.warn('Protocol deposit failed, but funds are bridged:', depositError);
          return {
            success: true,
            swapResult,
            explorerUrl: swapResult.explorerUrl,
            message: `Funds bridged to ${opportunity.chain}. Manual deposit to ${opportunity.protocol} needed.`,
            protocol: opportunity.protocol,
            warning: depositError.message,
          };
        }
      }

      // Case 2: Same token - use bridgeAndExecute for atomic operation
      onProgress?.(`Bridging and deploying ${amount} ${targetToken} to ${opportunity.protocol} on ${opportunity.chain}...`);

      // Get protocol deposit data
      const { getProtocolDepositData } = await import('./protocols');
      const depositData = getProtocolDepositData(
        opportunity.protocol,
        targetToken,
        amount,
        targetChainId,
        userAddress
      );

      if (!depositData) {
        // Fallback to old two-step approach if protocol not supported for bridgeAndExecute
        console.warn(`⚠️ ${opportunity.protocol} not supported for bridgeAndExecute, using fallback`);

        // Use old approach
        const bridgeResult = await this.bridgeToChain(
          targetToken,
          amount,
          currentChainId,
          targetChainId,
          (event) => {
            if (event.type === 'steps') onProgress?.('Bridge steps initiated');
            else if (event.type === 'complete') onProgress?.('Bridge step completed');
          }
        );

        return {
          success: true,
          bridgeResult,
          explorerUrl: bridgeResult.explorerUrl,
          message: `Funds bridged to ${opportunity.chain}. Please deposit manually to ${opportunity.protocol}.`,
          protocol: opportunity.protocol,
        };
      }

      // Use bridgeAndExecute for atomic bridge + deposit
      try {
        const result = await this.bridgeAndExecute(
          targetToken,
          amount,
          currentChainId,
          targetChainId,
          depositData.address,
          depositData.data,
          userAddress,
          (event) => {
            if (event.type === 'steps') {
              onProgress?.('Bridge and Execute steps initiated', event.steps);
            } else if (event.type === 'complete') {
              onProgress?.(`Step completed: ${event.step?.type || 'Processing'}`);
            }
          }
        );

        return {
          success: true,
          result,
          explorerUrl: result.explorerUrl,
          message: `Successfully deployed to ${opportunity.protocol}! Now earning ${opportunity.apy.toFixed(2)}% APY`,
          protocol: opportunity.protocol,
          apy: opportunity.apy,
        };
      } catch (error: any) {
        console.error('❌ Bridge and Execute failed:', error);
        throw new Error(`Failed to deploy: ${error.message}`);
      }
    } catch (error: any) {
      console.error('❌ Deployment failed:', error);
      throw new Error(error.message || 'Deployment failed');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.sdk) {
      try {
        // Only call deinit if it exists
        if (typeof this.sdk.deinit === 'function') {
          this.sdk.deinit();
        }
      } catch (error) {
        console.warn('Failed to cleanup Nexus SDK:', error);
      } finally {
        this.sdk = null;
        this.initialized = false;
      }
    }
  }
}

// Export singleton instance
export const nexusManager = new NexusManager();
