export type OrderStatus =
    | "PLACED"
    | "CONFIRMED"
    | "PREPARING"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    menuItem: {
        id: string;
        name: string;
        image: string | null;
        description: string | null;
    };
}

export interface UserOrder {
    id: string;
    customerId: string;
    restaurantId: string;
    status: OrderStatus;
    totalAmount: number;
    itemTotal: number;
    tax: number;
    deliveryCharge: number;
    platformFee: number;
    paymentMode: "COD" | "UPI" | "CARD" | "NETBANKING" | "WALLET";
    isPaid: boolean;
    placedAt: string;
    deliveredAt: string | null;
    restaurant: {
        name: string;
        image: string | null;
        id: string;
    };
    items: OrderItem[];
}
// Must match the backend Prisma enum: UPI | CARD | NETBANKING | WALLET | COD
export type PaymentMode = "COD" | "UPI" | "CARD" | "NETBANKING" | "WALLET";

export interface CreateOrderPayload {
    restaurantId: string;
    items: {
        menuItemId: string;
        quantity: number;
    }[];
    paymentMode: PaymentMode;
}
