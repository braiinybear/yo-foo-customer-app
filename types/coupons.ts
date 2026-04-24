export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface Coupon {
    id: string;
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscount?: number;
    minOrder: number;
    validFrom: string;
    validTo: string;
    isActive: boolean;
    usageLimit?: number;
    perUserLimit: number;
    timesUsed: number;
    createdAt: string;
}

export interface ValidateCouponRequest {
    code: string;
    orderTotal: number;
}

export interface ValidateCouponResponse {
    valid: boolean;
    code: string;
    discountType: DiscountType;
    discount: number;
    message: string;
}
