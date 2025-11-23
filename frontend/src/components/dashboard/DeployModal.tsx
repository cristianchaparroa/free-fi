/**
 * DeployModal Component
 *
 * Modal for deploying funds to a yield opportunity
 * Handles cross-chain bridging via Nexus SDK and deployment to protocols
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BracketBox } from '@/components/ui/BracketBox';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { YieldOpportunity, nexusManager } from '@/lib/nexus';
import { useAccount, useBalance } from 'wagmi';

interface DeployResult {
  explorerUrl?: string;
  message?: string;
}

interface DeployModalProps {
  opportunity: YieldOpportunity;
  onClose: () => void;
  onDeploy: (opportunity: YieldOpportunity, amount: string, sourceToken?: string) => Promise<DeployResult>;
}

type DeploymentStep = 'input' | 'approving' | 'bridging' | 'deploying' | 'success' | 'error';

export const DeployModal: React.FC<DeployModalProps> = ({
  opportunity,
  onClose,
  onDeploy,
}) => {
  const { address, chainId } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<DeploymentStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balancesByChain, setBalancesByChain] = useState<Array<{chain: string, amount: number}>>([]);
  const [swappableBalances, setSwappableBalances] = useState<Array<{token: string, amount: number, usdValue: number}>>([]);
  const [selectedSourceToken, setSelectedSourceToken] = useState<string | null>(null);

  // Get unified balance across all chains from Nexus SDK
  useEffect(() => {
    const fetchUnifiedBalance = async () => {
      try {
        setLoadingBalance(true);

        // Check if Nexus SDK is initialized
        if (!nexusManager.isInitialized()) {
          console.log('Nexus SDK not ready, skipping balance fetch');
          setLoadingBalance(false);
          return;
        }

        // Get balances including swappable ones
        const balances = await nexusManager.getUnifiedBalances(true);

        // Filter for exact token match
        const tokenBalances = balances.filter(b => b.token === opportunity.token);

        // Sum up all balances for this token
        const total = tokenBalances.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);

        // Store balances by chain
        const byChain = tokenBalances
          .map(b => ({
            chain: b.chain,
            amount: parseFloat(b.amount || '0')
          }))
          .filter(b => b.amount > 0);

        setTotalBalance(total);
        setBalancesByChain(byChain);

        // If no balance for target token, find swappable tokens
        if (total === 0) {
          // Note: POL/MATIC swaps are not well supported by Nexus SDK yet
          const supportedTokens = ['ETH', 'USDC', 'USDT', 'DAI'];
          const swappable = balances
            .filter(b => supportedTokens.includes(b.token) && b.token !== opportunity.token)
            .map(b => ({
              token: b.token,
              amount: parseFloat(b.amount || '0'),
              usdValue: b.usdValue || 0
            }))
            .filter(b => b.amount > 0);

          // Group by token and sum amounts
          const grouped = swappable.reduce((acc, curr) => {
            const existing = acc.find(item => item.token === curr.token);
            if (existing) {
              existing.amount += curr.amount;
              existing.usdValue += curr.usdValue;
            } else {
              acc.push({ ...curr });
            }
            return acc;
          }, [] as Array<{token: string, amount: number, usdValue: number}>);

          setSwappableBalances(grouped);
        } else {
          setSwappableBalances([]);
        }
      } catch (err) {
        console.log('Could not fetch unified balance:', err);
        setTotalBalance(0);
        setBalancesByChain([]);
        setSwappableBalances([]);
      } finally {
        setLoadingBalance(false);
      }
    };

    if (address) {
      fetchUnifiedBalance();
    }
  }, [address, opportunity.token]);

  // Get current chain balance as fallback
  const { data: currentChainBalance } = useBalance({
    address,
    token: opportunity.token === 'ETH' ? undefined : opportunity.token as `0x${string}`,
  });

  const balance = totalBalance > 0 ? totalBalance : (currentChainBalance ? parseFloat(currentChainBalance.formatted) : 0);

  const handleDeploy = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (balance && parseFloat(amount) > balance) {
      setError('Insufficient balance across all chains');
      return;
    }

    try {
      setError(null);
      setStep('bridging'); // Show bridging/swapping step
      const result = await onDeploy(opportunity, amount, selectedSourceToken || undefined);

      // Handle success
      setExplorerUrl(result.explorerUrl || null);
      setResultMessage(result.message || 'Deployment successful');
      setStep('success');
    } catch (err: any) {
      console.error('Deployment failed:', err);
      setError(err.message || 'Deployment failed');
      setStep('error');
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 'input':
        return (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">
                Deploy to {opportunity.protocol}
              </h3>
              <div className="text-sm text-gray-400">
                {opportunity.chain} • {opportunity.token} • {opportunity.apy.toFixed(2)}% APY
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 uppercase mb-2 block">
                Amount to Deploy
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-black border border-[#5B8FFF]/30 text-white px-4 py-3 font-mono text-lg focus:outline-none focus:border-[#5B8FFF]"
                  step="0.01"
                  min="0"
                />
                <div className="px-4 py-3 bg-[#5B8FFF]/20 border border-[#5B8FFF]/30 text-white font-mono">
                  {opportunity.token}
                </div>
              </div>
              {loadingBalance ? (
                <div className="text-xs text-gray-500 mt-2">
                  Loading balance...
                </div>
              ) : !nexusManager.isInitialized() ? (
                <div className="text-xs text-gray-400 mt-2 bg-black/40 p-2 border border-white/10">
                  ℹ️ Nexus SDK initializing... Using current chain balance only.
                </div>
              ) : balance > 0 ? (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">
                    Available (all chains): {balance.toFixed(4)} {opportunity.token}
                    <button
                      onClick={() => setAmount(balance.toString())}
                      className="ml-2 text-[#5B8FFF] hover:text-white"
                    >
                      [MAX]
                    </button>
                  </div>
                  {balancesByChain.length > 0 && (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {balancesByChain.map((b, i) => (
                        <div key={i}>
                          • {b.chain}: {b.amount.toFixed(4)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : swappableBalances.length > 0 ? (
                <div className="mt-2">
                  <div className="text-xs text-[#F4B944] mb-2">
                    ⚠️ No {opportunity.token} found. You can swap from:
                  </div>
                  <div className="space-y-2">
                    {swappableBalances.map((swap, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedSourceToken(swap.token)}
                        className={`text-xs p-2 border cursor-pointer transition-colors ${
                          selectedSourceToken === swap.token
                            ? 'bg-[#5B8FFF]/20 border-[#5B8FFF]'
                            : 'bg-black/40 border-white/10 hover:border-[#5B8FFF]/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">{swap.token}</span>
                          <span className="text-gray-400">{swap.amount.toFixed(4)}</span>
                        </div>
                        {selectedSourceToken === swap.token && (
                          <div className="text-[#2DD4BF] mt-1 text-[10px]">
                            ✓ Will swap {swap.token} → {opportunity.token}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedSourceToken && (
                    <button
                      onClick={() => {
                        const selected = swappableBalances.find(s => s.token === selectedSourceToken);
                        if (selected) setAmount(selected.amount.toString());
                      }}
                      className="mt-2 text-xs text-[#5B8FFF] hover:text-white"
                    >
                      [USE MAX {selectedSourceToken}]
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#FF6B6B] mt-2">
                  No {opportunity.token} or swappable tokens found
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-black/40 p-4 border border-white/10 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Chain:</span>
                <span className="text-white font-mono">Chain ID {chainId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Chain:</span>
                <span className="text-white font-mono">{opportunity.chain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected APY:</span>
                <span className="text-[#2DD4BF] font-bold">{opportunity.apy.toFixed(2)}%</span>
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-gray-400">Est. Yearly Earnings:</span>
                  <span className="text-[#2DD4BF] font-bold">
                    ${((parseFloat(amount) * opportunity.apy) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B] text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-white/20 text-white px-4 py-3 hover:bg-white/5 transition-colors font-mono"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeploy}
                className="flex-1 bg-[#5B8FFF] border border-[#5B8FFF] text-black px-4 py-3 hover:bg-[#4A7EEE] transition-colors font-bold font-mono"
              >
                DEPLOY →
              </button>
            </div>
          </>
        );

      case 'approving':
      case 'bridging':
      case 'deploying':
        return (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-[#5B8FFF] animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {step === 'approving' && 'Approving Token...'}
              {step === 'bridging' && (selectedSourceToken ? `Swapping ${selectedSourceToken} → ${opportunity.token}...` : 'Bridging to Target Chain...')}
              {step === 'deploying' && 'Deploying to Protocol...'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Please confirm the transaction in your wallet
            </p>
            {selectedSourceToken && (
              <div className="text-xs bg-black/40 p-3 border border-white/10 text-left max-w-md mx-auto">
                <div className="text-[#F4B944] mb-2">⚠️ Multi-step transaction:</div>
                <div className="space-y-1 text-gray-400">
                  <div>1. Approve {selectedSourceToken} spending</div>
                  <div>2. Swap {selectedSourceToken} → {opportunity.token}</div>
                  <div>3. Bridge to {opportunity.chain}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-[#2DD4BF] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Deployment Successful!
            </h3>
            <p className="text-gray-400 mb-4">
              {resultMessage || `Your ${opportunity.token} is now earning yield on ${opportunity.protocol}`}
            </p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[#5B8FFF] hover:text-white text-sm mb-4 underline"
              >
                View Transaction →
              </a>
            )}
            <div className="text-xs text-[#2DD4BF] bg-[#2DD4BF]/10 p-3 border border-[#2DD4BF]/30 mb-6">
              🎉 Your funds are now deployed to {opportunity.protocol} earning {opportunity.apy.toFixed(2)}% APY!
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#5B8FFF] text-black px-4 py-3 font-bold font-mono hover:bg-[#4A7EEE] transition-colors"
            >
              CLOSE
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-[#FF6B6B] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Deployment Failed
            </h3>
            <p className="text-gray-400 mb-6">
              {error || 'An error occurred during deployment'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-white/20 text-white px-4 py-3 hover:bg-white/5 transition-colors font-mono"
              >
                CLOSE
              </button>
              <button
                onClick={() => setStep('input')}
                className="flex-1 bg-[#5B8FFF] text-black px-4 py-3 font-bold font-mono hover:bg-[#4A7EEE] transition-colors"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full">
        <BracketBox
          title="DEPLOY FUNDS"
          headerRight={
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          }
        >
          {getStepContent()}
        </BracketBox>
      </div>
    </div>
  );
};
