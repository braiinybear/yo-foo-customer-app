import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";

export const useRestaurants = () => {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      // The interceptor automatically adds the Bearer Token
      const { data } = await apiClient.get("/api/restaurants");
      return data;
    },
  });
};