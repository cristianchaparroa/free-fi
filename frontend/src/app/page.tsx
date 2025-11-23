/**
 * FreeFi Main Application Page
 *
 * Root page component implementing the Dragonfly-inspired DeFi interface.
 * Features animated crypto globe background, landing page for visitors,
 * and comprehensive dashboard for connected users.
 *
 * Architecture:
 * - Client-side rendered (Next.js App Router)
 * - State management for wallet connection and user inputs
 * - Conditional rendering based on connection state
 * - Responsive design with mobile-first approach
 */

'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { CryptoGlobe } from '@/components/ui/CryptoGlobe';
import { LandingView } from '@/components/landing/LandingView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { Theme } from '@/types';

export default function Home() {
  // Web3 wallet connection state
  const { isConnected } = useAccount();

  // Dragonfly / Fluid DeFi color palette
  const theme: Theme = {
    bg: '#0F1419',
    surface: '#141923',
    brand: '#5B8FFF',    // Ethereum Blue
    success: '#2DD4BF',  // Turquoise Yield/USDC
    warning: '#F4B944',  // Gold Warning
    text: '#FFFFFF',
    textDim: 'rgba(255, 255, 255, 0.5)',
    border: 'rgba(91, 143, 255, 0.3)',
    grid: 'rgba(91, 143, 255, 0.05)'
  };


  return (
    <div
      className="min-h-screen w-full text-white font-mono selection:bg-[#5B8FFF] selection:text-black relative bg-[#0F1419] overflow-x-hidden"
    >
      {/* Animated Crypto Globe Background */}
      <CryptoGlobe theme={theme} />

      {/* Grid Pattern Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Main Content */}
      <main className="relative z-10">
        {isConnected ? (
          <DashboardView />
        ) : (
          <LandingView />
        )}
      </main>
    </div>
  );
}
