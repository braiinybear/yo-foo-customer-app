import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import {
  PaginatedRestaurantsResponse,
  RestaurantDetail,
 
} from "@/types/restaurants";
const PAGE_LIMIT = 3;

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchRestaurantsPaged = async (
  page: number
): Promise<PaginatedRestaurantsResponse> => {
  const { data } = await apiClient.get("/api/restaurants", {
    params: { page, limit: PAGE_LIMIT },
  });

  
  return data as PaginatedRestaurantsResponse;
};

const fetchRestaurantDetail = async (id: string) => {
  const { data } = await apiClient.get(`/api/restaurants/${id}`);
  return data as RestaurantDetail;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Infinite-scroll hook for the home restaurant listing.
 * Pages through /api/restaurants?page=N&limit=5 automatically.
 */
export const useRestaurants = () =>
  useInfiniteQuery<PaginatedRestaurantsResponse>({
    queryKey: ["restaurants"],
    queryFn: ({ pageParam }) => fetchRestaurantsPaged(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });

export const useRestaurantDetail = (id: string) =>
  useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => fetchRestaurantDetail(id),
    enabled: !!id,
  });

