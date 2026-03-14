import apiClient from "@/lib/axios";
import { CreateReviewRequest, ReviewResponse } from "@/types/review";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
    },
  });
};
