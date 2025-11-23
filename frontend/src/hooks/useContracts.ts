/**
 * Custom hook to get contract addresses and ABIs for current chain
 */

import { useChainId } from 'wagmi';
import { getContractAddresses, hasVault, hasEVVM, isSupportedChain } from '@/lib/contracts';
import { ABIS } from '@/lib/abis';

export function useContracts() {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    return {
        // Contract addresses
        addresses,

        // ABIs
        abis: ABIS,

        // Chain info
        chainId,
        isSupported: isSupportedChain(chainId),
        hasVault: hasVault(chainId),
        hasEVVM: hasEVVM(chainId),

        // Vault contract (only on Sepolia)
        vault: addresses && hasVault(chainId) ? {
            address: addresses.vault as `0x${string}`,
            abi: ABIS.VaultEVVM,
        } : null,

        // OFT contract (all chains)
        oft: addresses?.oft ? {
            address: addresses.oft as `0x${string}`,
            abi: ABIS.YieldFlowOFTEVVM,
        } : null,

        // USDC contract (all chains)
        usdc: addresses?.usdc ? {
            address: addresses.usdc as `0x${string}`,
            abi: ABIS.MockERC20,
        } : null,
    };
}
