export type OrderStatus =
    "ACCEPTED"
    | "PLACED"
    | "CONFIRMED"
    | "PREPARING"
    | "ON_THE_WAY"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUSED"
    |   "READY"
   | "PICKED_UP"


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
    paymentMode: "COD" | "UPI" | "CARD" | "NETBANKING" | "WALLET" | "RAZORPAY";
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

export interface CurrentOrder {
    id: string;
    customerId: string;
    restaurantId: string;
    driverId: string | null;
    status: OrderStatus;
    otp: string | null;
    cancellationReason: string | null;
    itemTotal: number;
    tax: number;
    deliveryCharge: number;
    platformFee: number;
    driverTip: number;
    discount: number;
    promoCode: string | null;
    commission: number;
    totalAmount: number;
    paymentMode: PaymentMode;
    isPaid: boolean;
    placedAt: string;
    acceptedAt: string | null;
    pickedUpAt: string | null;
    deliveredAt: string | null;
    restaurant: {
        name: string;
        image: string | null;
        id: string;
        address: string;
        lat: number;
        lng: number;
    };
    driver: {
        id: string;
        name: string;
        phone: string;
        vehiclePlate: string;
        profilePic: string | null;
        currentLat: number | null;
        currentLng: number | null;
    } | null;
    items: {
        id: string;
        orderId: string;
        menuItemId: string;
        quantity: number;
        price: number;
        menuItem: {
            id: string;
            categoryId: string;
            name: string;
            description: string | null;
            price: number;
            image: string | null;
            type: "VEG" | "NON_VEG" | "EGG";
            isAvailable: boolean;
            isBestseller: boolean;
            spiceLevel: string | null;
            prepTime: number;
            createdAt: string;
            updatedAt: string;
        };
    }[];
}
// Must match the backend Prisma enum: UPI | CARD | NETBANKING | WALLET | COD | RAZORPAY
export type PaymentMode = "COD" | "UPI" | "CARD" | "NETBANKING" | "WALLET" | "RAZORPAY";

export interface CreateOrderPayload {
    restaurantId: string;
    items: {
        menuItemId: string;
        quantity: number;
    }[];
    paymentMode: PaymentMode;
}

export interface OrderDetails {
    id: string;
    customerId: string;
    restaurantId: string;
    driverId: string | null;
    status: OrderStatus;
    otp: string | null;
    cancellationReason: string | null;
    itemTotal: number;
    tax: number;
    deliveryCharge: number;
    platformFee: number;
    driverTip: number;
    totalAmount: number;
    paymentMode: PaymentMode;
    isPaid: boolean;
    placedAt: string;
    acceptedAt: string | null;
    pickedUpAt: string | null;
    deliveredAt: string | null;
    driver: {
        id: string;
        name: string;
        phone: string;
        vehiclePlate: string;
        profilePic: string | null;
        currentLat: number | null;
        currentLng: number | null;
    } | null;
    items: {
        id: string;
        orderId: string;
        menuItemId: string;
        quantity: number;
        price: number;
        menuItem: {
            id: string;
            categoryId: string;
            name: string;
            description: string | null;
            price: number;
            image: string | null;
            type: "VEG" | "NON_VEG" | "EGG";
            isAvailable: boolean;
            isBestseller: boolean;
            spiceLevel: string | null;
            prepTime: number;
            createdAt: string;
            updatedAt: string;
        };
    }[];
    restaurant: {
        id: string;
        managerId: string;
        name: string;
        description: string | null;
        image: string | null;
        costForTwo: number;
        cuisineTypes: string[];
        address: string;
        lat: number;
        lng: number;
        isActive: boolean;
        isOpen: boolean;
        isVerified: boolean;
        rating: number;
        ratingCount: number;
        type: "VEG" | "NON_VEG" | "BOTH";
        createdAt: string;
        updatedAt: string;
    };
    customerAddress: {
        id: string;
        addressLine: string;
        landmark: string | null;
        lat: number;
        lng: number;
    } | null;
}
