import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Restaurant } from '@/types/restaurants';

interface FavoritesState {
  favorites: Restaurant[];
  addFavorite: (restaurant: Restaurant) => void;
  removeFavorite: (restaurantId: string) => void;
  isFavorite: (restaurantId: string) => boolean;
  toggleFavorite: (restaurant: Restaurant) => void;
}

// Custom storage object for SecureStore to work with zustand's persist middleware
const SecureStoreAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (restaurant) => {
        if (!get().isFavorite(restaurant.id)) {
          set((state) => ({ favorites: [...state.favorites, restaurant] }));
        }
      },
      removeFavorite: (restaurantId) => {
        set((state) => ({
          favorites: state.favorites.filter((r) => r.id !== restaurantId),
        }));
      },
      isFavorite: (restaurantId) => {
        return get().favorites.some((r) => r.id === restaurantId);
      },
      toggleFavorite: (restaurant) => {
        if (get().isFavorite(restaurant.id)) {
          get().removeFavorite(restaurant.id);
        } else {
          get().addFavorite(restaurant);
        }
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => SecureStoreAdapter),
    }
  )
);
