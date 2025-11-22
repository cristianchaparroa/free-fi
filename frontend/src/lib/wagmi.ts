/**
 * Wagmi Configuration for FreeFi
 *
 * Configures Web3 wallet connections using wagmi and RainbowKit.
 * Supports multiple chains and wallet providers.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  polygon,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';

/**
 * Wagmi configuration with RainbowKit defaults
 * Includes support for:
 * - Ethereum Mainnet
 * - Polygon
 * - Arbitrum
 * - Base
 * - Sepolia (testnet)
 */
export const config = getDefaultConfig({
  appName: 'FreeFi - Global Savings Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    mainnet,
    polygon,
    arbitrum,
    base,
    sepolia,
  ],
  ssr: true, // Enable server-side rendering support
});
