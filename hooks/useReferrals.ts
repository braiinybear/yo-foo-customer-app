import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { ReferralStats, ApplyReferralRequest, ApplyReferralResponse } from '../types/referral';

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchReferralStats = async (): Promise<ReferralStats> => {
    const { data } = await apiClient.get('/referrals/my-stats');
    return data;
};

const applyReferral = async (payload: ApplyReferralRequest): Promise<ApplyReferralResponse> => {
    const { data } = await apiClient.post('/referrals/apply', payload);
    return data;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch current user's referral stats (my code, referral count, estimate, etc.)
 */
export const useReferralStats = () => {
    return useQuery<ReferralStats, Error>({
        queryKey: ['referral-stats'],
        queryFn: fetchReferralStats,
    });
};

/**
 * Hook to apply a referral code.
 */
export const useApplyReferral = () => {
    const queryClient = useQueryClient();
    return useMutation<ApplyReferralResponse, Error, ApplyReferralRequest>({
        mutationFn: applyReferral,
        onSuccess: () => {
            // Invalidate referral stats, wallet balance, and user profile queries to keep them in sync
            queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};
