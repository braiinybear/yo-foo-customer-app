import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { Restaurant, RestaurantDetail } from "@/types/restaurants";

const fetchRestaurants = async () => {
  const { data } = await apiClient.get("/api/restaurants");
  return data as Restaurant[];
};

const fetchRestaurantDetail = async (id: string) => {
  const { data } = await apiClient.get(`/api/restaurants/${id}`);
  return data as RestaurantDetail;
};

export const useRestaurants = () =>
  useQuery({ queryKey: ["restaurants"], queryFn: fetchRestaurants });

export const useRestaurantDetail = (id: string) =>
  useQuery({queryKey: ["restaurant", id],queryFn: () => fetchRestaurantDetail(id),enabled: !!id,
  });