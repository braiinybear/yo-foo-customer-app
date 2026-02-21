import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { CurrentUser } from "@/types/user";

export const useUser = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data} = await apiClient.get("/api/auth/me");
      return data as CurrentUser;
    },
  });
};