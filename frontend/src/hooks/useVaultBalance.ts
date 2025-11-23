/**
 * Hook to read vault balance for connected user
 */

import { useAccount, useReadContract } from 'wagmi';
import { useContracts } from './useContracts';

export function useVaultBalance() {
    const { address } = useAccount();
    const { vault } = useContracts();

    // Read user's vault shares
    const { data: shares, isLoading: isLoadingShares, refetch: refetchShares } = useReadContract({
        address: vault?.address,
        abi: vault?.abi,
        functionName: 'userShares',
        args: address ? [address] : undefined,
        query: {
            enabled: !!vault && !!address,
        },
    });

    // Read total vault shares
    const { data: totalShares } = useReadContract({
        address: vault?.address,
        abi: vault?.abi,
        functionName: 'totalShares',
        query: {
            enabled: !!vault,
        },
    });

    // Read total deposits (USDC value)
    const { data: totalDeposits } = useReadContract({
        address: vault?.address,
        abi: vault?.abi,
        functionName: 'totalDeposits',
        query: {
            enabled: !!vault,
        },
    });

    // Calculate USDC value from shares
    const calculateUsdcValue = (userShares: bigint): bigint => {
        if (!totalShares || !totalDeposits || totalShares === 0n) {
            return 0n;
        }
        return (userShares * totalDeposits) / totalShares;
    };

    const usdcValue = shares ? calculateUsdcValue(shares as bigint) : 0n;

    return {
        // User's vault shares
        shares: shares as bigint | undefined,

        // User's USDC value
        usdcValue,

        // Formatted values (in human-readable format with 6 decimals for USDC)
        formattedShares: shares ? Number(shares) / 1e18 : 0,
        formattedUsdcValue: Number(usdcValue) / 1e6,

        // Loading state
        isLoading: isLoadingShares,

        // Refetch function
        refetch: refetchShares,
    };
}
