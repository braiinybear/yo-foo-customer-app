import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { Restaurant, RestaurantDetail, SearchParams } from "@/types/restaurants";



const fetchRestaurants = async () => {
  const { data } = await apiClient.get("/api/restaurants");
  return data as Restaurant[];
};

const fetchRestaurantDetail = async (id: string) => {
  const { data } = await apiClient.get(`/api/restaurants/${id}`);
  return data as RestaurantDetail;
};

const fetchRestaurantsBySearch = async (params: SearchParams) => {
  const { data } = await apiClient.get(`/api/restaurants/search`, {
    params: {
      ...params,
      minRating: params.minRating ?? 0
    }
  });
  return data as Restaurant[];
};

export const useRestaurants = () =>
  useQuery({ queryKey: ["restaurants"], queryFn: fetchRestaurants });

export const useRestaurantDetail = (id: string) =>
  useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => fetchRestaurantDetail(id),
    enabled: !!id,
  });

export const useRestaurantsBySearch = (params: SearchParams) =>
  useQuery({
    queryKey: ["restaurants", "search", params],
    queryFn: () => fetchRestaurantsBySearch(params),
    enabled: !!(params.query || params.type || params.minRating !== undefined)
  });