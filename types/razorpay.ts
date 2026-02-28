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


// Wallet Types

export interface WalletBalanceResponse {
    id: string,
    userId: string,
    balance: number
}

export interface WalletTopUpPayload {
    amount: number
}

export interface WalletTopUpResponse {
    razorpayOrder: {
        amount: number;
        amount_due: number;
        amount_paid: number;
        attempts: number;
        created_at: number;
        currency: string;
        entity: string;
        id: string;
        notes: any[];
        offer_id: string | null;
        receipt: string;
        status: string;
    };
    topupRequestId: string;
    amount: number;
}


export interface WalletTransaction {
    id: string;
    walletId: string;
    /** API returns "TOPUP" for credits, "DEBIT" for order payments */
    type: "TOPUP" | "DEBIT" | string;
    amount: number;
    createdAt: string;
}

export interface PaginatedTransactionsResponse {
    data: WalletTransaction[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}



export interface VerifyWalletTopUpRequest {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
}