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