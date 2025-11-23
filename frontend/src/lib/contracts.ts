/**
 * Contract addresses and configuration
 */

export const CONTRACTS = {
  // Sepolia (Destination chain with EVVM)
  sepolia: {
    chainId: 11155111,
    vault: '0x4dcBa47fE89A8AEfC1Af3eCD37a468aB9527a843',
    oft: '0xf0b4B6F06F9581A6E726C0DcdFF269c34558E6Fd',
    usdc: '0x607A8217770b32c9FE2329DC3fc8bc5A491a5DeE',
    evvm: '0x9902984d86059234c3B6e11D5eAEC55f9627dD0f',
    nameService: '0x8038e87dc67D87b31d890FD01E855a8517ebfD24',
    lzEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    lzEid: 40161,
  },

  // Arbitrum Sepolia (Source chain)
  arbitrumSepolia: {
    chainId: 421614,
    oft: '0xf0b4B6F06F9581A6E726C0DcdFF269c34558E6Fd',
    usdc: '0x607A8217770b32c9FE2329DC3fc8bc5A491a5DeE',
    lzEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    lzEid: 40231,
  },

  // Base Sepolia (Source chain) - Add when deployed
  baseSepolia: {
    chainId: 84532,
    oft: undefined, // Deploy later
    usdc: undefined,
    lzEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    lzEid: 40245,
  },
} as const;

/**
 * Get contract addresses for current chain
 */
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 11155111:
      return CONTRACTS.sepolia;
    case 421614:
      return CONTRACTS.arbitrumSepolia;
    case 84532:
      return CONTRACTS.baseSepolia;
    default:
      return null;
  }
}

/**
 * Check if chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId === 11155111 || chainId === 421614 || chainId === 84532;
}

/**
 * Check if chain has vault deployed (only Sepolia)
 */
export function hasVault(chainId: number): boolean {
  return chainId === 11155111;
}

/**
 * Check if chain has EVVM support (only Sepolia)
 */
export function hasEVVM(chainId: number): boolean {
  return chainId === 11155111;
}
