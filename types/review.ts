export interface CreateReviewRequest {
  orderId: string;
  foodRating: number;
  deliveryRating: number;
  comment?: string;
}

export interface ReviewResponse {
  message: string;
}

export interface RestaurantReview {
  id: string;
  orderId: string;
  userId: string;
  user: {
    name: string;
    image: string | null;
  };
  restaurantId: string;
  foodRating: number;
  deliveryRating: number;
  comment: string | null;
  createdAt: string;
}

export interface PaginatedReviewsResponse {
  data: RestaurantReview[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}