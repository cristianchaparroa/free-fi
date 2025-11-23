/**
 * UnifiedBalance Component
 * 
 * Shows all user balances across chains in one view
 * Uses Avail Nexus SDK for unified balance retrieval
 */

'use client';

import React from 'react';
import { BracketBox } from '@/components/ui/BracketBox';
import { useNexus } from '@/hooks/useNexus';
import { RefreshCw } from 'lucide-react';

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
};

export const UnifiedBalance: React.FC = () => {
  const { balances, loading, refreshBalances, error } = useNexus();

  const totalUSD = balances.reduce((sum, b) => {
    const fiatValue = b.balanceInFiat ? parseFloat(b.balanceInFiat) : 0;
    return sum + fiatValue;
  }, 0);

  return (
    <BracketBox
      title="UNIFIED BALANCE"
      headerRight={
        <button
          onClick={refreshBalances}
          className="text-[#5B8FFF] hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* Total Value */}
      <div className="mb-6 pb-4 border-b border-white/10">
        <div className="text-xs text-gray-400 uppercase mb-1">Total Value</div>
        <div className="text-3xl font-bold text-white font-mono">
          ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Balances by Chain */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/5 p-3 border border-white/10">
              <div className="h-3 bg-white/10 rounded w-2/3 mb-2"></div>
              <div className="h-2 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-xs bg-[#FF6B6B]/10 p-4 border border-[#FF6B6B]/30">
          <div className="text-[#FF6B6B] font-bold mb-2">⚠️ Unable to load balances</div>
          <div className="text-gray-400 mb-3">{error}</div>
          <div className="text-xs text-gray-500">
            Make sure you're connected to Sepolia testnet and have initialized the Nexus SDK.
          </div>
        </div>
      ) : balances.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-400 text-sm mb-2">No balances found on testnet</div>
          <div className="text-xs text-gray-500">
            Get testnet tokens from faucets to see your balances here
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {balances
            .filter(balance => {
              // Only show tokens with non-zero balances
              const amount = parseFloat(balance.balance || '0');
              return amount > 0;
            })
            .map((balance, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-[#0F1419] border border-white/10 hover:border-[#5B8FFF]/50 transition-colors"
            >
              <div>
                <div className="font-bold text-white text-sm">{balance.symbol || balance.token}</div>
                <div className="text-xs text-gray-400 font-mono">
                  {balance.chain || CHAIN_NAMES[balance.chainId] || 'Unknown Chain'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white text-sm font-mono">
                  {balance.balance && parseFloat(balance.balance) > 0
                    ? parseFloat(balance.balance).toFixed(4)
                    : '0.0000'
                  }
                </div>
                <div className="text-xs text-gray-500">
                  {balance.balanceInFiat && parseFloat(balance.balanceInFiat) > 0
                    ? `$${parseFloat(balance.balanceInFiat).toFixed(2)}`
                    : '$0.00'
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
        <span className="text-[#5B8FFF]">●</span> Powered by Avail Nexus
      </div>
    </BracketBox>
  );
};
