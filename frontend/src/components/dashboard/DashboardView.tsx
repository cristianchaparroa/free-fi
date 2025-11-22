/**
 * DashboardView Component
 *
 * Main dashboard view for connected users featuring:
 * - Portfolio status with balance and earnings
 * - Active strategy display
 * - Deposit and withdraw operation panels
 * - Yield performance chart
 * - Event log timeline
 * - Network status indicator
 *
 * This is the core interface where users manage their FreeFi positions.
 */

'use client';

import React from 'react';
import { Globe, Activity } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BracketBox } from '@/components/ui/BracketBox';
import { YieldChart } from '@/components/dashboard/YieldChart';
import { EventLog } from '@/components/dashboard/EventLog';
import { DepositPanel } from '@/components/dashboard/DepositPanel';
import { WithdrawPanel } from '@/components/dashboard/WithdrawPanel';

interface DashboardViewProps {
  amount: string;
  onAmountChange: (value: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  amount,
  onAmountChange
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end mb-8 font-mono border-b border-[#5B8FFF] pb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <div className="w-3 h-3 bg-[#5B8FFF]"></div> FreeFi{' '}
            <span className="text-xs bg-[#5B8FFF]/20 px-1 text-[#5B8FFF]">V1.0</span>
          </h1>
          <div className="w-32 h-[2px] bg-[#5B8FFF] mt-1"></div>
        </div>
        <div className="flex items-center gap-4 text-sm mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-gray-400 border border-white/10 px-3 py-1 bg-black/40">
            <Globe size={14} /> Ethereum Sepolia
          </div>
          <ConnectButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Portfolio Status */}
        <BracketBox title="PORTFOLIO STATUS">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="text-5xl font-mono font-bold text-white mb-2 tracking-tighter">
                $5,247.89{' '}
                <span className="text-lg text-gray-500 font-normal">USDC</span>
              </div>
              <div className="flex items-center gap-2 text-[#2DD4BF] font-mono bg-[#2DD4BF]/10 px-3 py-1 inline-block border border-[#2DD4BF]/20">
                <Activity size={14} />
                +$47.89 earned (0.92%)
              </div>
            </div>
            <div className="text-right font-mono space-y-1 bg-black/40 p-4 border border-white/5">
              <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">
                Active Strategy
              </div>
              <div className="text-white text-lg mb-1">Compound Arbitrum</div>
              <div className="text-[#2DD4BF] font-bold text-xl">12.3% APY 🔥</div>
            </div>
          </div>
        </BracketBox>

        {/* Deposit & Withdraw Operations */}
        <div className="grid md:grid-cols-2 gap-8">
          <BracketBox title="DEPOSIT OPERATIONS" className="border-[#5B8FFF]/50">
            <DepositPanel amount={amount} onAmountChange={onAmountChange} />
          </BracketBox>

          <BracketBox title="WITHDRAW OPERATIONS">
            <WithdrawPanel />
          </BracketBox>
        </div>

        {/* Performance Metrics & Event Log */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <BracketBox title="YIELD PERFORMANCE METRICS">
              <YieldChart />
              <div className="mt-10 text-xs font-mono text-gray-400 flex items-center gap-2 bg-[#141923] p-2 inline-block border border-white/5">
                <span className="text-[#F4B944]">📍</span> Last rebalanced:{' '}
                <span className="text-white">2h ago</span> (Strategy Shift)
              </div>
            </BracketBox>
          </div>

          <div className="md:col-span-1">
            <BracketBox title="EVENT LOG">
              <EventLog />
              <div className="pt-4 border-t border-white/5 mt-2">
                <span className="text-[#5B8FFF] text-xs cursor-pointer hover:text-white transition-colors">
                  [ View Full Log ]
                </span>
              </div>
            </BracketBox>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center font-mono text-[10px] text-gray-600 mt-12 mb-4 uppercase tracking-widest">
        Secured by LayerZero • Powered by Saga • Assets by Circle
      </div>
    </div>
  );
};
