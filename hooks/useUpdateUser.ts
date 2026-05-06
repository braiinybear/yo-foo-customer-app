import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { CurrentUser } from "@/types/user";

export interface UpdateUserDto {
  name?: string;
  image?: string | null;
  gender?: string;
  dob?: string;
  isVeg?: boolean;
  email?: string;
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserDto) => {
      const response = await apiClient.patch("/api/auth/me", data);
      return response.data as CurrentUser;
    },
    onSuccess: (data) => {
      // Update the 'user' query with the new data
      queryClient.setQueryData(["user"], data);
      // Also invalidate session in authClient if needed
    },
  });
};
