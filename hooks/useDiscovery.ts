import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { authClient } from "@/lib/auth-client";
import { Cuisine, MenuItemDiscovery, RecentSearch } from "@/types/discovery";

// ── Discovery Queries ─────────────────────────────────────────────────────────

/** Fetch all active cuisines for the discovery section */
export const useCuisines = () => {
  return useQuery<Cuisine[]>({
    queryKey: ["cuisines"],
    queryFn: async (): Promise<Cuisine[]> => {
      const { data } = await apiClient.get("/api/discovery/cuisines");
      return data as Cuisine[];
    },
  });
};

/** Fetch popular menu items with their restaurant IDs for search suggestions */
export const useMenuItemsDiscovery = () => {
  return useQuery<MenuItemDiscovery[]>({
    queryKey: ["menu-items-discovery"],
    queryFn: async (): Promise<MenuItemDiscovery[]> => {
      const { data } = await apiClient.get("/api/discovery/menu-items");
      return data as MenuItemDiscovery[];
    },
  });
};

/** Fetch the current user's recent search history */
export const useRecentSearches = () => {
  const { data: session } = authClient.useSession();
  
  return useQuery<RecentSearch[]>({
    queryKey: ["recent-searches", session?.user?.id],
    queryFn: async (): Promise<RecentSearch[]> => {
      const { data } = await apiClient.get("/api/discovery/recent-searches");
      return data as RecentSearch[];
    },
    enabled: !!session?.user?.id,
  });
};

// ── Search Mutations ──────────────────────────────────────────────────────────

/** Save a new search query to the user's history */
export const useAddRecentSearch = () => {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation({
    mutationFn: async (query: string) => {
      const { data } = await apiClient.post("/api/discovery/recent-searches", { query });
      return data;
    },
    onSuccess: () => {
      // Refresh history list after adding a new search
      queryClient.invalidateQueries({ queryKey: ["recent-searches", session?.user?.id] });
    },
  });
};

/** Clear all search history for the logged-in user */
export const useClearRecentSearches = () => {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete("/api/discovery/recent-searches");
      return data;
    },
    onSuccess: () => {
      // Clear history from cache immediately
      queryClient.invalidateQueries({ queryKey: ["recent-searches", session?.user?.id] });
    },
  });
};
