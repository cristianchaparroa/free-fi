/**
 * DepositPanel Component
 *
 * Form panel for deposit operations with:
 * - USDC amount input with cursor animation
 * - Source network selector dropdown
 * - Target yield and bridge fee display
 * - Styled submit button
 *
 * Integrates with wallet connection state (will be connected to Web3 later).
 */

'use client';

import React from 'react';

interface DepositPanelProps {
  amount: string;
  onAmountChange: (value: string) => void;
  onDeposit: () => void;
  isLoading?: boolean;
}

export const DepositPanel: React.FC<DepositPanelProps> = ({
  amount,
  onAmountChange,
  onDeposit,
  isLoading = false
}) => {
  return (
    <div className="space-y-6 font-mono">
      {/* Amount Input */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-2">
          Asset Amount (USDC)
        </label>
        <div className="relative group">
          <input
            type="text"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-full bg-[#0F1419] border border-[#5B8FFF] p-4 text-white focus:outline-none group-hover:bg-[#5B8FFF]/5 transition-colors"
            placeholder="1000"
          />
          <span className="absolute right-4 top-4 text-gray-500 animate-pulse">
            _
          </span>
        </div>
      </div>

      {/* Network Selector */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-2">
          Source Network
        </label>
        <div className="border border-[#5B8FFF]/30 p-3 flex justify-between items-center text-sm text-white cursor-pointer hover:border-[#5B8FFF] bg-[#0F1419] transition-colors">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#627EEA]"></div> Ethereum
          </span>
          <span className="text-[#5B8FFF]">▼</span>
        </div>
      </div>

      {/* Fee Summary */}
      <div className="text-xs space-y-2 pt-4 border-t border-dashed border-[#5B8FFF]/30 text-gray-400">
        <div className="flex justify-between">
          <span>Target Yield:</span>
          <span className="text-[#2DD4BF]">12.3% APY</span>
        </div>
        <div className="flex justify-between">
          <span>Est. Bridge Fee:</span>
          <span className="text-white">~$8.00</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={onDeposit}
        disabled={isLoading || !amount || parseFloat(amount) < 1}
        className={`w-full py-4 border border-[#5B8FFF] bg-[#5B8FFF] text-[#0F1419] font-bold uppercase tracking-widest transition-all ${
          isLoading || !amount || parseFloat(amount) < 1
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white hover:border-white'
        }`}
      >
        {isLoading ? '[ Processing... ]' : '[ Initiate Deposit ]'}
      </button>
    </div>
  );
};
