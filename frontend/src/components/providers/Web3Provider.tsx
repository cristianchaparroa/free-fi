/**
 * Web3Provider Component
 *
 * Wraps the application with RainbowKit and wagmi providers.
 * Enables wallet connection functionality throughout the app.
 *
 * Must be used in a client component due to React hooks and state.
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Determine initial chain based on network mode
const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE === 'testnet';
const initialChain = isTestnet ? sepolia : mainnet;

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider
 *
 * Provides Web3 context to the entire application.
 * Includes:
 * - React Query for data fetching
 * - Wagmi for Ethereum interactions
 * - RainbowKit for wallet connection UI
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="en-US"
          initialChain={initialChain}
          theme={darkTheme({
            accentColor: '#5B8FFF', // FreeFi brand blue
            accentColorForeground: '#0F1419',
            borderRadius: 'none', // Match FreeFi design
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
