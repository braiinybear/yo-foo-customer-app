export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
  role: "CUSTOMER" | "ADMIN" | "RESTAURANT_MANAGER" | "DELIVERY_PARTNER";
  dob: string | null;
  gender: string | null;
  isVeg: boolean;
  language: string;
  referralCode: string;
  referredById: string | null;
  createdAt: string;
  referralCount: number;
  _count: {
    referrals: number;
  };
}

export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null | undefined;
  phoneNumber?: string | null | undefined;
  phoneNumberVerified?: boolean | null | undefined;
};
export interface UserAddress {
  id: string;
  userId: string;
  type: string;
  addressLine: string;
  landmark?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}


export interface AddressFormState {
  type?: string;
  addressLine: string;
  landmark?: string;
  lat: number | null;
  lng: number | null;
}