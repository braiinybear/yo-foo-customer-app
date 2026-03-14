import apiClient from "@/lib/axios";
import {
  SearchRestaurantsParams,
  SearchRestaurantsResponse,
} from "@/types/search";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useUserLocation } from "./useUserLocation";

export const searchRestaurants = async (
  params: SearchRestaurantsParams,
): Promise<SearchRestaurantsResponse> => {
  const { data } = await apiClient.get<SearchRestaurantsResponse>(
    "/api/restaurants/search",
    { params },
  );
  console.table(data);
  
  return data;
};

export const useSearchRestaurants = (params: SearchRestaurantsParams) => {
  const { coords } = useUserLocation();

  return useInfiniteQuery({
    queryKey: ["restaurants-search", params, coords],

    queryFn: ({ pageParam = 1 }) =>
      searchRestaurants({
        ...params,
        page: pageParam,
        userLat: coords?.lat,
        userLng: coords?.lng,
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.length * (params.limit ?? 10);

      if (totalFetched >= lastPage.totalUniqueDishes) {
        return undefined;
      }

      return pages.length + 1;
    },
  });
};
