/**
 * DeFi Llama Yields API Integration
 * 
 * Fetches real-time yield opportunities from DeFi Llama
 * API Docs: https://defillama.com/docs/api
 */

import { YieldOpportunity } from './nexus';

// Use Next.js API route to bypass CORS
const DEFILLAMA_API = '/api/yields';

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  il7d?: number;
  exposure?: string;
  predictions?: {
    predictedClass: string;
    binnedConfidence: number;
  };
}

/**
 * Map DeFi Llama chain names to our chain IDs
 * Switches between mainnet and testnet based on NEXT_PUBLIC_NETWORK_MODE
 */
const isTestnet = process.env.NEXT_PUBLIC_NETWORK_MODE === 'testnet';

const MAINNET_CHAINS: Record<string, { chainId: number; name: string }> = {
  'Ethereum': { chainId: 1, name: 'Ethereum' },
  'Arbitrum': { chainId: 42161, name: 'Arbitrum' },
  'Optimism': { chainId: 10, name: 'Optimism' },
  'Base': { chainId: 8453, name: 'Base' },
  'Polygon': { chainId: 137, name: 'Polygon' },
};

const TESTNET_CHAINS: Record<string, { chainId: number; name: string }> = {
  'Ethereum': { chainId: 11155111, name: 'Sepolia' },
  'Arbitrum': { chainId: 421614, name: 'Arbitrum Sepolia' },
  'Optimism': { chainId: 11155420, name: 'Optimism Sepolia' },
  'Base': { chainId: 84532, name: 'Base Sepolia' },
  'Polygon': { chainId: 80002, name: 'Polygon Amoy' },
};

const CHAIN_MAP = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

/**
 * Calculate risk score (1-10) based on various factors
 */
function calculateRiskScore(pool: DefiLlamaPool): number {
  let score = 5; // Base score

  // Lower risk for established protocols
  const lowRiskProtocols = ['aave', 'compound', 'curve', 'uniswap'];
  if (lowRiskProtocols.some(p => pool.project.toLowerCase().includes(p))) {
    score -= 2;
  }

  // Higher risk for very high APY
  if (pool.apy > 50) score += 3;
  else if (pool.apy > 20) score += 1;

  // Lower risk for higher TVL
  if (pool.tvlUsd > 100000000) score -= 1; // >100M
  if (pool.tvlUsd < 1000000) score += 2;   // <1M

  // Impermanent loss risk
  if (pool.il7d && pool.il7d > 1) score += 1;

  return Math.max(1, Math.min(10, score));
}

/**
 * Fetch all pools from DeFi Llama
 */
export async function fetchAllYields(): Promise<YieldOpportunity[]> {
  try {
    const response = await fetch(DEFILLAMA_API);
    const data = await response.json();
    
    if (!data.data) {
      throw new Error('Invalid response from DeFi Llama');
    }

    const pools: DefiLlamaPool[] = data.data;

    // Filter and transform pools
    const opportunities: YieldOpportunity[] = pools
      .filter(pool => {
        // Only include supported chains
        if (!CHAIN_MAP[pool.chain]) return false;

        // Only stablecoins and major tokens (including POL/MATIC for Polygon)
        const supportedTokens = ['USDC', 'USDT', 'DAI', 'ETH', 'WETH', 'POL', 'MATIC', 'WMATIC'];
        if (!supportedTokens.some(t => pool.symbol.toUpperCase().includes(t))) return false;

        // Minimum TVL
        if (pool.tvlUsd < 500000) return false;

        // Reasonable APY (filter out scams/outliers)
        if (pool.apy > 200 || pool.apy < 0.1) return false;

        return true;
      })
      .map(pool => {
        // Determine token type
        let token: 'USDC' | 'USDT' | 'ETH' | 'POL' = 'ETH';
        const symbolUpper = pool.symbol.toUpperCase();

        if (symbolUpper.includes('USDC')) token = 'USDC';
        else if (symbolUpper.includes('USDT')) token = 'USDT';
        else if (symbolUpper.includes('POL') || symbolUpper.includes('MATIC')) token = 'POL';
        else if (symbolUpper.includes('ETH')) token = 'ETH';

        return {
          protocol: pool.project,
          chain: CHAIN_MAP[pool.chain].name,
          chainId: CHAIN_MAP[pool.chain].chainId,
          token,
          apy: pool.apy,
          tvl: pool.tvlUsd,
          riskScore: calculateRiskScore(pool),
        };
      })
      .sort((a, b) => b.apy - a.apy); // Sort by APY descending

    return opportunities;
  } catch (error) {
    console.error('Failed to fetch yields from DeFi Llama:', error);
    throw error;
  }
}

/**
 * Get top opportunities by token and risk tolerance
 */
export async function getTopOpportunitiesByToken(
  token: 'USDC' | 'USDT' | 'ETH',
  count: number = 5,
  maxRiskScore: number = 6
): Promise<YieldOpportunity[]> {
  const all = await fetchAllYields();
  
  return all
    .filter(opp => opp.token === token && opp.riskScore <= maxRiskScore)
    .slice(0, count);
}

/**
 * Get best opportunity for a token across all chains
 */
export async function getBestOpportunity(
  token: 'USDC' | 'USDT' | 'ETH',
  maxRiskScore: number = 6
): Promise<YieldOpportunity | null> {
  const opportunities = await getTopOpportunitiesByToken(token, 1, maxRiskScore);
  return opportunities[0] || null;
}
