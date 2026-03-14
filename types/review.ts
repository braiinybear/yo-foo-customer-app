export interface CreateReviewRequest {
  orderId: string;
  foodRating: number;
  deliveryRating: number;
  comment?: string;
}

export interface ReviewResponse {
  message: string;
}