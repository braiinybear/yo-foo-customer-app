import apiClient from "@/lib/axios";
import { CreateReviewRequest, ReviewResponse, PaginatedReviewsResponse } from "@/types/review";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const submitReview = async (
  body: CreateReviewRequest,
): Promise<ReviewResponse> => {
  const response = await apiClient.post("/reviews", body);

  return response.data;
};
export const useSubmitReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReview,

    onSuccess: () => {
      // refresh relevant data
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-reviews"] });
    },
  });
};

export const useRestaurantReviews = (restaurantId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["restaurant-reviews", restaurantId, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reviews/restaurant/${restaurantId}`, {
        params: { page, limit },
      });
      return data as PaginatedReviewsResponse;
    },
    enabled: !!restaurantId,
  });
};
