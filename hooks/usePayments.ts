import { useMutation } from "@tanstack/react-query";
import apiClient from "../lib/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreatePaymentOrderResponse {
    razorpayOrder: {
        id: string;                  // e.g. "order_SKIgtlfSOIdxKi"
        amount: number;              // in paise   e.g. 49700
        currency: string;            // "INR"
        receipt: string;
        status: string;
    };
    paymentId: string;              // internal payment record id
    orderId: string;                // our DB order id
    amount: number;                 // in rupees  e.g. 497
}

export interface VerifyPaymentPayload {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
    orderId: string;
}

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
