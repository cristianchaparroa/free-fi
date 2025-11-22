/**
 * WithdrawPanel Component
 *
 * Form panel for withdrawal operations with:
 * - Withdraw amount input with max balance
 * - Destination network selector
 * - Estimated receive amount and protocol fee
 * - Styled submit button with hover states
 *
 * Features slightly muted styling to differentiate from deposit panel.
 */

'use client';

import React from 'react';

export const WithdrawPanel: React.FC = () => {
  return (
    <div className="space-y-6 font-mono opacity-75 hover:opacity-100 transition-opacity duration-300">
      {/* Amount Input */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-2">
          Withdraw Amount
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Max (5,247.89)"
            className="w-full bg-[#0F1419] border border-gray-600 p-4 text-gray-300 focus:outline-none focus:border-white transition-colors"
          />
        </div>
      </div>

      {/* Destination Selector */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-2">
          Destination
        </label>
        <div className="border border-gray-600 p-3 flex justify-between items-center text-sm text-gray-300 cursor-pointer hover:border-white transition-colors">
          <span>Ethereum</span>
          <span className="text-gray-500">▼</span>
        </div>
      </div>

      {/* Fee Summary */}
      <div className="text-xs space-y-2 pt-4 border-t border-dashed border-gray-600 text-gray-500">
        <div className="flex justify-between">
          <span>Est. Receive:</span>
          <span className="text-white">~$5,237 USDC</span>
        </div>
        <div className="flex justify-between">
          <span>Protocol Fee:</span>
          <span className="text-white">0.1%</span>
        </div>
      </div>

      {/* Submit Button */}
      <button className="w-full py-4 border border-gray-600 text-gray-400 font-bold uppercase tracking-widest hover:border-white hover:text-white hover:bg-white/5 transition-all">
        [ Request Withdraw ]
      </button>
    </div>
  );
};
