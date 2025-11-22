import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { keplrWallet } from '@keplr-wallet/rainbow-connector';
import { createConfig, http } from 'wagmi';
import { sepolia, arbitrumSepolia, baseSepolia } from 'wagmi/chains';

// Define Saga testnet chain
export const sagaTestnet = {
  id: 1337, // Replace with actual Saga chainlet ID
  name: 'Saga Testnet',
  nativeCurrency: { name: 'Saga', symbol: 'SAGA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-spc-rpc.sagarpc.io'] },
  },
  blockExplorers: {
    default: { name: 'Saga Explorer', url: 'https://explorer.saga.xyz' },
  },
  testnet: true,
} as const;

const chains = [
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  sagaTestnet,
] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        keplrWallet,
        walletConnectWallet,
        coinbaseWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: 'FreeFi - Cross-Chain Yield Optimizer',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '71d8c3310f0fb3c0788d5a4b6582820e',
  }
);

export const config = createConfig({
  connectors,
  chains,
  transports: {
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [sagaTestnet.id]: http(),
  },
  ssr: true,
});
