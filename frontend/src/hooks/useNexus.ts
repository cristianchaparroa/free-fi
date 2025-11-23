/**
 * useNexus Hook
 * 
 * React hook for interacting with Avail Nexus SDK
 * Provides unified balances and cross-chain operations
 */

'use client';

import { useState, useEffect } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { nexusManager, UnifiedBalance } from '@/lib/nexus';

export function useNexus() {
  const { data: walletClient } = useWalletClient();
  const { connector, chainId } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);
  const [balances, setBalances] = useState<UnifiedBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SDK when wallet connects (only once)
  useEffect(() => {
    const initNexus = async () => {
      if (walletClient && connector && !nexusManager.isInitialized()) {
        try {
          console.log('🔌 Wallet connected, initializing Nexus...');
          console.log(`📡 Current network: ${chainId}`);

          // Get EIP-1193 provider from connector
          const provider = await connector.getProvider();

          if (!provider) {
            console.warn('No provider available from connector');
            setIsInitialized(false);
            return;
          }

          await nexusManager.initialize(provider);
          console.log('✅ useNexus: SDK ready');
          setIsInitialized(true);
          setError(null);
        } catch (err: any) {
          console.error('❌ useNexus: Initialization failed:', err);
          setError(err?.message || 'Failed to initialize');
          // Continue anyway - app will work without Nexus features
          setIsInitialized(false);
        }
      } else if (nexusManager.isInitialized() && !isInitialized) {
        // SDK is already initialized, just update state
        setIsInitialized(true);
      }
    };

    initNexus();
  }, [walletClient, connector, chainId]); // Removed isInitialized from deps

  // Fetch balances
  const fetchBalances = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching balances...');
      const unifiedBalances = await nexusManager.getUnifiedBalances();
      console.log('✅ Balances fetched:', unifiedBalances);
      setBalances(unifiedBalances);
    } catch (err: any) {
      console.error('❌ Failed to fetch balances:', err);
      setError(err?.message || 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch balances ONLY when SDK is initialized
  useEffect(() => {
    if (isInitialized) {
      fetchBalances();
    }
  }, [isInitialized]);

  return {
    isInitialized,
    balances,
    loading,
    error,
    refreshBalances: fetchBalances,
    nexusManager,
  };
}
