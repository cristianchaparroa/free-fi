/**
 * Yield Aggregator - Fetch and compare DeFi yields
 * 
 * Simplified yield discovery across multiple chains and protocols.
 * In production, this would connect to:
 * - DeFi Llama API
 * - Protocol-specific APIs (Aave, Compound, etc.)
 * - On-chain data
 */

import { YieldOpportunity } from './nexus';

/**
 * Mock yield data - MAINNET chains
 * Replace with real API calls in production
 */
const MOCK_OPPORTUNITIES: YieldOpportunity[] = [
  {
    protocol: 'Aave',
    chain: 'Arbitrum',
    chainId: 42161,
    token: 'USDC',
    apy: 5.2,
    tvl: 250000000,
    riskScore: 2,
  },
  {
    protocol: 'Compound',
    chain: 'Arbitrum',
    chainId: 42161,
    token: 'USDC',
    apy: 12.3,
    tvl: 180000000,
    riskScore: 2,
  },
  {
    protocol: 'Yearn',
    chain: 'Optimism',
    chainId: 10,
    token: 'USDC',
    apy: 6.8,
    tvl: 150000000,
    riskScore: 3,
  },
  {
    protocol: 'Beefy',
    chain: 'Polygon',
    chainId: 137,
    token: 'USDC',
    apy: 8.5,
    tvl: 80000000,
    riskScore: 5,
  },
  {
    protocol: 'Curve',
    chain: 'Base',
    chainId: 8453,
    token: 'USDC',
    apy: 4.9,
    tvl: 120000000,
    riskScore: 2,
  },
];

/**
 * Fetch current yield opportunities
 */
export async function fetchYields(): Promise<YieldOpportunity[]> {
  // TODO: Replace with real API calls
  // Example: const response = await fetch('https://yields.llama.fi/pools');
  return MOCK_OPPORTUNITIES;
}

/**
 * Find best opportunity for a given token
 */
export function findBestOpportunity(
  token: string,
  riskTolerance: 'low' | 'medium' | 'high' = 'medium'
): YieldOpportunity | null {
  const maxRiskScore = {
    low: 3,
    medium: 6,
    high: 10,
  }[riskTolerance];

  const filtered = MOCK_OPPORTUNITIES.filter(
    (opp) => opp.token === token && opp.riskScore <= maxRiskScore
  );

  if (filtered.length === 0) return null;

  // Sort by APY descending
  filtered.sort((a, b) => b.apy - a.apy);

  return filtered[0];
}

/**
 * Get top N opportunities
 */
export function getTopOpportunities(
  count: number = 5,
  riskTolerance: 'low' | 'medium' | 'high' = 'medium'
): YieldOpportunity[] {
  const maxRiskScore = {
    low: 3,
    medium: 6,
    high: 10,
  }[riskTolerance];

  return MOCK_OPPORTUNITIES
    .filter((opp) => opp.riskScore <= maxRiskScore)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, count);
}

/**
 * Calculate if rebalancing is worth the gas cost
 */
export function calculateRebalanceWorth(
  currentAPY: number,
  newAPY: number,
  amount: number,
  estimatedGasCost: number
): { worthIt: boolean; breakEvenDays: number; yearlyGain: number } {
  const apyDifference = newAPY - currentAPY;
  const yearlyGain = (apyDifference / 100) * amount;
  const dailyGain = yearlyGain / 365;
  const breakEvenDays = dailyGain > 0 ? Math.ceil(estimatedGasCost / dailyGain) : Infinity;

  const worthIt = breakEvenDays < 30 && yearlyGain > estimatedGasCost * 2;

  return {
    worthIt,
    breakEvenDays,
    yearlyGain,
  };
}
