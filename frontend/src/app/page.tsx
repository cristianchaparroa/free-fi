'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold">FreeFi</h1>
        <ConnectButton />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Cross-Chain Yield Optimizer</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Earn the best stablecoin rates across all chains. Automatically. Gasless.
          </p>
        </div>
      </main>
    </div>
  );
}
