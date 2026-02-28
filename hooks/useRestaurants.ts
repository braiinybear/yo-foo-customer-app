import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import {
  PaginatedRestaurantsResponse,
  RestaurantDetail,
  SearchParams,
} from "@/types/restaurants";
import { useUserLocation } from "./useUserLocation";

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

const fetchRestaurantsBySearch = async (
  params: SearchParams,
  page: number
): Promise<PaginatedRestaurantsResponse> => {
  const { data } = await apiClient.get(`/api/restaurants/search`, {
    params: {
      ...params,
      minRating: params.minRating ?? 0,
      page,
      limit: PAGE_LIMIT,
    },
  });
  return data as PaginatedRestaurantsResponse;
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

/**
 * Infinite-scroll search hook.
 *
 * – Automatically injects device location so userLat/userLng are always sent.
 * – Waits for coords before firing the first request.
 * – Pages through results using the same page/limit meta as the listing endpoint.
 */
export const useRestaurantsBySearch = (params: SearchParams) => {
  const { coords } = useUserLocation();

  const finalParams: SearchParams = {
    ...params,
    ...(coords && {
      userLat: coords.lat,
      userLng: coords.lng,
    }),
  };

  const hasSearchCriteria =
    !!(params.query || params.type || params.minRating !== undefined || params.sortBy);

  const coordsReady = coords !== null;

  return useInfiniteQuery<PaginatedRestaurantsResponse>({
    queryKey: ["restaurants", "search", finalParams],
    queryFn: ({ pageParam }) =>
      fetchRestaurantsBySearch(finalParams, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: hasSearchCriteria && coordsReady,
  });
};