import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { Coupon, ValidateCouponRequest, ValidateCouponResponse } from '../types/coupons';

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchAvailableCoupons = async (): Promise<Coupon[]> => {
    const { data } = await apiClient.get('/api/coupons/available');
    return data;
};

const validateCoupon = async (payload: ValidateCouponRequest): Promise<ValidateCouponResponse> => {
    const { data } = await apiClient.post('/api/coupons/validate', payload);
    return data;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch available coupons for the current user.
 */
export const useAvailableCoupons = () => {
    return useQuery({
        queryKey: ['available-coupons'],
        queryFn: fetchAvailableCoupons,
    });
};

/**
 * Hook to validate a coupon code before checkout.
 */
export const useValidateCoupon = () => {
    return useMutation<ValidateCouponResponse, Error, ValidateCouponRequest>({
        mutationFn: validateCoupon,
    });
};

