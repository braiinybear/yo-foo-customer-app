import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import {
    CreatePaymentOrderResponse,
    VerifyPaymentPayload,
    WalletBalanceResponse,
    WalletTopUpPayload,
    WalletTopUpResponse,
    VerifyWalletTopUpRequest,
    WalletTransaction,
} from "@/types/razorpay";

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Step 1 – Create a Razorpay order on the backend */
export const useCreatePaymentOrder = () => {
    return useMutation({
        mutationFn: async (orderId: string): Promise<CreatePaymentOrderResponse> => {
            const { data } = await apiClient.post("/api/payments/create-order", { orderId });
            return data as CreatePaymentOrderResponse;
        },
    });
};

/** Step 2 – Verify the Razorpay signature after checkout */
export const useVerifyPayment = () => {
    return useMutation({
        mutationFn: async (payload: VerifyPaymentPayload) => {
            const { data } = await apiClient.post("/api/payments/verify", payload);
            return data;
        },
    });
};

// ── Wallet Queries & Mutations ────────────────────────────────────────────────

/** Fetch the current user's wallet balance */
export const useWalletBalance = () => {
    return useQuery({
        queryKey: ["wallet", "balance"],
        queryFn: async (): Promise<WalletBalanceResponse> => {
            const { data } = await apiClient.get("/api/wallets/balance");
            return data as WalletBalanceResponse;
        },
    });
};

/** Fetch wallet transaction history */
export const useWalletTransactions = () => {
    return useQuery({
        queryKey: ["wallet", "transactions"],
        queryFn: async (): Promise<WalletTransaction[]> => {
            const { data } = await apiClient.get("/api/wallets/transactions");
            return data as WalletTransaction[];
        },
    });
};

/** Step 1 – Initiate a wallet top-up via Razorpay */
export const useWalletTopUp = () => {
    return useMutation({
        mutationFn: async (payload: WalletTopUpPayload): Promise<WalletTopUpResponse> => {
            const { data } = await apiClient.post("/api/wallets/topup", payload);
            return data as WalletTopUpResponse;
        },
    });
};

/** Step 2 – Verify top-up signature and credit the wallet */
export const useVerifyWalletTopUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: VerifyWalletTopUpRequest) => {
            const { data } = await apiClient.post("/api/wallets/verify", payload);
            return data;
        },
        onSuccess: () => {
            // Refresh wallet balance + transactions after successful top-up
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
        },
    });
};
