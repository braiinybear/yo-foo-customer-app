export interface ReferralUser {
  id: string;
  name: string;
  createdAt: string;
}

export interface ReferralStats {
  myCode: string;
  totalReferrals: number;
  earningsEst: number;
  referrals: ReferralUser[];
}

export interface ApplyReferralRequest {
  referralCode: string;
}

export interface ApplyReferralResponse {
  success: boolean;
  message: string;
}
