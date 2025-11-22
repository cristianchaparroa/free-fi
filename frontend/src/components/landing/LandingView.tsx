/**
 * LandingView Component
 *
 * Main landing page for non-connected users featuring:
 * - Hero section with animated gradient title
 * - Feature cards (Gasless, Cross-Chain, Auto-Optimized)
 * - Live market rates comparison
 * - FreeFi vs Legacy DeFi comparison grid
 * - System architecture footer
 *
 * Designed to convert visitors into users with clear value proposition.
 */

'use client';

import React from 'react';
import {
  Zap,
  Box,
  Activity,
  X,
  CheckCircle2
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BracketBox } from '@/components/ui/BracketBox';
import { Badge } from '@/components/ui/Badge';
import { RateData, FeatureCard } from '@/types';

export const LandingView: React.FC = () => {
  const features: FeatureCard[] = [
    {
      icon: Zap,
      title: "Gasless",
      desc: "No fees on Saga. Ever.",
      color: "#F4B944"
    },
    {
      icon: Box,
      title: "Cross-Chain",
      desc: "Deposit from any chain.",
      color: "#5B8FFF"
    },
    {
      icon: Activity,
      title: "Auto-Optimized",
      desc: "Always best rates.",
      color: "#2DD4BF"
    }
  ];

  const marketRates: RateData[] = [
    { name: "Compound Arbitrum", apy: "12.3%", best: true },
    { name: "Morpho Base", apy: "10.2%", best: false },
    { name: "Aave Polygon", apy: "8.4%", best: false },
    { name: "Aave Ethereum", apy: "4.1%", best: false }
  ];

  return (
    <div className="max-w-5xl mx-auto pt-12 pb-20 px-4 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-20 border-b border-[#5B8FFF]/30 pb-4 font-mono">
        <div className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 bg-[#5B8FFF]"></div>
          Free<span className="text-[#5B8FFF]">Fi</span>
        </div>
        <ConnectButton />
      </div>

      {/* Hero Section */}
      <div className="text-center mb-24">
        <div className="h-24"></div> {/* Space for globe visibility */}

        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white font-mono tracking-tight drop-shadow-2xl">
          GLOBAL SAVINGS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B8FFF] to-[#2DD4BF] drop-shadow-[0_0_10px_rgba(91,143,255,0.5)]">
            PROTOCOLS
          </span>
        </h1>

        <p className="text-gray-400 max-w-xl mx-auto font-mono text-sm md:text-base mb-10 leading-relaxed bg-black/40 p-4 backdrop-blur-sm border border-white/5">
          <span className="text-[#5B8FFF]">&gt;</span> Connected to LayerZero
          <br />
          <span className="text-[#2DD4BF]">&gt;</span> Optimizing USDC/EURC
          <br />
          <span className="text-[#F4B944]">&gt;</span> Gasless Execution Active
        </p>

        <div className="flex justify-center">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="bg-[#5B8FFF] text-[#0F1419] font-bold font-mono px-8 py-4 hover:bg-white transition-all uppercase tracking-widest border border-[#5B8FFF] shadow-[0_0_20px_rgba(91,143,255,0.3)] flex items-center gap-2"
              >
                <Zap size={16} /> Initialize App
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 font-mono text-sm">
        {features.map((item, i) => (
          <div
            key={i}
            className="border border-[#5B8FFF]/30 p-6 bg-[#0F1419]/80 relative group hover:border-[#5B8FFF] transition-colors backdrop-blur-md"
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0F1419] px-2"
              style={{ color: item.color }}
            >
              <item.icon size={24} />
            </div>
            <h3 className="text-center text-white font-bold mt-4 mb-2 uppercase tracking-wider">
              {item.title}
            </h3>
            <div className="w-8 h-[1px] bg-[#5B8FFF] mx-auto mb-4"></div>
            <p className="text-center text-gray-400 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Market Rates & Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Live Market Rates */}
        <BracketBox title="LIVE MARKET RATES">
          <div className="space-y-3 font-mono text-sm">
            {marketRates.map((rate, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-2 hover:bg-white/5 transition-colors cursor-default"
              >
                <span className={rate.best ? "text-white font-bold" : "text-gray-500"}>
                  {rate.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={rate.best ? "text-[#2DD4BF]" : "text-gray-500"}>
                    {rate.apy} APY
                  </span>
                  {rate.best && <Badge text="BEST" type="success" />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-[#5B8FFF]/20 text-xs text-[#F4B944] flex items-center gap-2">
            <Zap size={12} />
            <span className="animate-pulse">FreeFi auto-routes to max yield</span>
          </div>
        </BracketBox>

        {/* Comparative Analysis */}
        <BracketBox title="COMPARATIVE ANALYSIS">
          <div className="space-y-6 font-mono text-sm">
            {/* Legacy DeFi */}
            <div>
              <div className="text-gray-500 mb-2 text-xs uppercase tracking-wider">
                Legacy DeFi
              </div>
              <ul className="space-y-2 text-gray-500 pl-4 border-l border-gray-800">
                <li className="flex items-center gap-2">
                  <X size={12} /> $5-20 gas per tx
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} /> Manual bridging
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} /> Static yields
                </li>
              </ul>
            </div>

            {/* FreeFi Protocol */}
            <div>
              <div className="text-[#2DD4BF] mb-2 text-xs uppercase tracking-wider">
                FreeFi Protocol
              </div>
              <ul className="space-y-2 text-white pl-4 border-l border-[#2DD4BF]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#2DD4BF]" />
                  $0 Gas (Saga sponsored)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#2DD4BF]" />
                  Auto-Rebalancing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#2DD4BF]" />
                  Single-click entry
                </li>
              </ul>
            </div>
          </div>
        </BracketBox>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center border-t border-[#5B8FFF]/20 pt-8 text-xs font-mono text-gray-500 uppercase tracking-widest">
        System Architecture: LayerZero x Saga x Circle
      </div>
    </div>
  );
};
