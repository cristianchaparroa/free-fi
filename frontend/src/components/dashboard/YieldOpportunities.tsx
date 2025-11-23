/**
 * YieldOpportunities Component
 * 
 * Displays top yield opportunities across chains
 * Matches FreeFi's terminal/bracket aesthetic
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BracketBox } from '@/components/ui/BracketBox';
import { fetchAllYields } from '@/lib/defiLlama';
import { DeployModal } from './DeployModal';
import { nexusManager } from '@/lib/nexus';
import type { YieldOpportunity } from '@/lib/nexus';
import { useAccount, useBalance, useWalletClient } from 'wagmi';

// Token addresses for balance checking (mainnet)
const TOKEN_ADDRESSES: Record<string, `0x${string}` | undefined> = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  ETH: undefined, // Native token
};

interface OpportunityCardProps {
  opportunity: YieldOpportunity;
  isConnected: boolean;
  address?: `0x${string}`;
  onDeploy: () => void;
  getRiskColor: (score: number) => string;
  getRiskLabel: (score: number) => string;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isConnected,
  address,
  onDeploy,
  getRiskColor,
  getRiskLabel,
}) => {
  const { data: balance } = useBalance({
    address,
    token: TOKEN_ADDRESSES[opportunity.token],
    chainId: opportunity.chainId, // Check balance on the opportunity's chain
  });

  const hasBalance = balance && parseFloat(balance.formatted) > 0;

  // Enable button if connected (Nexus will handle cross-chain bridging)
  const isDisabled = !isConnected;

  return (
    <div className="border border-[#5B8FFF]/30 hover:border-[#5B8FFF] transition-colors bg-[#0F1419] p-4 cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-white text-lg flex items-center gap-2">
            {opportunity.protocol}
            <span className={`text-xs ${getRiskColor(opportunity.riskScore)}`}>
              [{getRiskLabel(opportunity.riskScore)}]
            </span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {opportunity.chain} • {opportunity.token}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#2DD4BF]">
            {opportunity.apy.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">APY</div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="text-xs text-gray-400">
          TVL: ${(opportunity.tvl / 1000000).toFixed(0)}M
        </div>
        <button
          onClick={onDeploy}
          disabled={isDisabled}
          className="text-xs border border-[#5B8FFF] text-[#5B8FFF] px-3 py-1 hover:bg-[#5B8FFF] hover:text-black transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          title={!isConnected ? 'Connect wallet first' : 'Deploy with Nexus cross-chain bridging'}
        >
          {!isConnected ? 'CONNECT WALLET' : 'DEPLOY →'}
        </button>
      </div>
    </div>
  );
};

export const YieldOpportunities: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<'low' | 'medium' | 'high'>('medium');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedOpportunity, setSelectedOpportunity] = useState<YieldOpportunity | null>(null);

  useEffect(() => {
    const loadYields = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch real yields from DeFi Llama
        const yields = await fetchAllYields();
        const maxRisk = riskFilter === 'low' ? 3 : riskFilter === 'medium' ? 6 : 10;

        let filtered = yields.filter(opp => opp.riskScore <= maxRisk);

        // Apply chain filter
        if (chainFilter !== 'all') {
          filtered = filtered.filter(opp => opp.chain === chainFilter);
        }

        // Apply token filter
        if (tokenFilter !== 'all') {
          filtered = filtered.filter(opp => opp.token === tokenFilter);
        }

        console.log(`🔥 Found ${filtered.length} opportunities (showing ${Math.min(displayCount, filtered.length)})`);
        setOpportunities(filtered);
      } catch (err: any) {
        console.error('Failed to load yields:', err);
      } finally {
        setLoading(false);
      }
    };

    loadYields();
  }, [riskFilter, chainFilter, tokenFilter]);

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-[#2DD4BF]';
    if (score <= 6) return 'text-[#F4B944]';
    return 'text-[#FF6B6B]';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'LOW';
    if (score <= 6) return 'MED';
    return 'HIGH';
  };

  const handleDeploy = async (
    opportunity: YieldOpportunity,
    amount: string,
    sourceToken?: string
  ) => {
    console.log('🚀 Starting deployment:', { opportunity, amount, chainId, sourceToken });

    if (!chainId) {
      throw new Error('No chain connected');
    }

    if (!address) {
      throw new Error('No wallet address found');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      const result = await nexusManager.deployToOpportunity(
        opportunity,
        amount,
        chainId,
        address,
        walletClient,
        sourceToken, // Pass source token for swap if needed
        (message, data) => {
          console.log('📝 Progress:', message, data);
        }
      );

      console.log('✅ Deployment successful:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Deployment failed:', error);
      throw new Error(error.message || 'Deployment failed');
    }
  };

  // Get unique chains and tokens for filters
  const uniqueChains = ['all', ...new Set(opportunities.map(o => o.chain))];
  const uniqueTokens = ['all', ...new Set(opportunities.map(o => o.token))];

  // Paginate opportunities
  const displayedOpportunities = opportunities.slice(0, displayCount);
  const hasMore = displayCount < opportunities.length;

  return (
    <>
    <BracketBox
      title="TOP YIELD OPPORTUNITIES"
      headerRight={
        <div className="flex gap-2 items-center">
          <div className="text-xs px-2 py-1 border bg-[#2DD4BF] border-[#2DD4BF] text-black font-mono">
            🔴 LIVE
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="bg-[#0F1419] border border-[#5B8FFF]/30 text-white text-xs px-2 py-1 font-mono"
          >
            <option value="low">LOW RISK</option>
            <option value="medium">MEDIUM RISK</option>
            <option value="high">HIGH RISK</option>
          </select>
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="bg-[#0F1419] border border-[#5B8FFF]/30 text-white text-xs px-3 py-2 font-mono"
        >
          <option value="all">ALL CHAINS</option>
          {uniqueChains.filter(c => c !== 'all').map(chain => (
            <option key={chain} value={chain}>{chain.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={tokenFilter}
          onChange={(e) => setTokenFilter(e.target.value)}
          className="bg-[#0F1419] border border-[#5B8FFF]/30 text-white text-xs px-3 py-2 font-mono"
        >
          <option value="all">ALL TOKENS</option>
          {uniqueTokens.filter(t => t !== 'all').map(token => (
            <option key={token} value={token}>{token}</option>
          ))}
        </select>

        <div className="text-xs text-gray-400 flex items-center ml-auto">
          Showing {displayedOpportunities.length} of {opportunities.length}
        </div>
      </div>
      {error && (
        <div className="mb-3 p-2 bg-[#F4B944]/10 border border-[#F4B944]/30 text-xs text-[#F4B944]">
          ⚠️ Using mock data: {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-white/10 p-4 bg-black/20">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayedOpportunities.map((opp, index) => (
              <OpportunityCard
                key={index}
                opportunity={opp}
                isConnected={isConnected}
                address={address}
                onDeploy={() => setSelectedOpportunity(opp)}
                getRiskColor={getRiskColor}
                getRiskLabel={getRiskLabel}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setDisplayCount(prev => prev + 10)}
                className="text-xs border border-[#5B8FFF] text-[#5B8FFF] px-4 py-2 hover:bg-[#5B8FFF] hover:text-black transition-colors font-bold font-mono"
              >
                LOAD MORE ({opportunities.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </BracketBox>

    {/* Deploy Modal */}
    {selectedOpportunity && (
      <DeployModal
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onDeploy={handleDeploy}
      />
    )}
    </>
  );
};
