/**
 * Wagmi Configuration for FreeFi
 *
 * Configures Web3 wallet connections using wagmi and RainbowKit.
 * Supports multiple chains and wallet providers.
 * Switches between mainnet and testnet based on NEXT_PUBLIC_NETWORK_MODE env variable.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  polygonAmoy,
} from 'wagmi/chains';

const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE === 'testnet';

const chains = isTestnet
  ? [sepolia, arbitrumSepolia, optimismSepolia, baseSepolia, polygonAmoy]
  : [mainnet, arbitrum, optimism, base, polygon];

/**
 * Wagmi configuration with RainbowKit defaults
 * Dynamically switches between mainnet and testnet chains
 */
export const config = getDefaultConfig({
  appName: 'FreeFi - Global Savings Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: chains as any,
  ssr: true, // Enable server-side rendering support
});
