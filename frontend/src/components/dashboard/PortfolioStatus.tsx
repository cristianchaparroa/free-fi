/**
 * PortfolioStatus Component
 *
 * Displays real-time portfolio data from VaultEVVM contract:
 * - User's USDC balance in vault
 * - Earned yield
 * - Active strategy and APY
 */

'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { useAccount } from 'wagmi';

export const PortfolioStatus: React.FC = () => {
    const { isConnected } = useAccount();
    const { formattedUsdcValue, isLoading } = useVaultBalance();

    // Mock data for now - TODO: Get real APY and strategy from contract/backend
    const currentApy = 12.3;
    const activeStrategy = 'Compound Arbitrum';

    if (!isConnected) {
        return (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="text-5xl font-mono font-bold text-gray-600 mb-2 tracking-tighter">
                        $0.00{' '}
                        <span className="text-lg text-gray-500 font-normal">USDC</span>
                    </div>
                    <div className="text-gray-500 font-mono text-sm">
                        Connect wallet to view balance
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="text-5xl font-mono font-bold text-white mb-2 tracking-tighter animate-pulse">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    // Calculate earned amount (mock for now - would come from contract events)
    const earnedAmount = formattedUsdcValue * 0.01; // Assume 1% earned
    const earnedPercentage = formattedUsdcValue > 0 ? (earnedAmount / formattedUsdcValue) * 100 : 0;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <div className="text-5xl font-mono font-bold text-white mb-2 tracking-tighter">
                    ${formattedUsdcValue.toFixed(2)}{' '}
                    <span className="text-lg text-gray-500 font-normal">USDC</span>
                </div>
                {formattedUsdcValue > 0 && (
                    <div className="flex items-center gap-2 text-[#2DD4BF] font-mono bg-[#2DD4BF]/10 px-3 py-1 inline-block border border-[#2DD4BF]/20">
                        <Activity size={14} />
                        +${earnedAmount.toFixed(2)} earned ({earnedPercentage.toFixed(2)}%)
                    </div>
                )}
                {formattedUsdcValue === 0 && (
                    <div className="text-gray-500 font-mono text-sm">
                        No deposits yet. Start earning yield!
                    </div>
                )}
            </div>
            <div className="text-right font-mono space-y-1 bg-black/40 p-4 border border-white/5">
                <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">
                    Active Strategy
                </div>
                <div className="text-white text-lg mb-1">{activeStrategy}</div>
                <div className="text-[#2DD4BF] font-bold text-xl">{currentApy}% APY 🔥</div>
            </div>
        </div>
    );
};
