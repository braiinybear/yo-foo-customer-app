import { useCartStore } from "@/store/useCartStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { useSocketStore } from "@/store/useSocketStore";
import * as SecureStore from 'expo-secure-store';

/**
 * Centrally clears all cached and persisted user session state
 * to ensure that subsequent logins do not leak stale data.
 */
export async function clearUserSessionState(queryClient?: any) {
  try {
    console.log("🧹 Clearing all persistent user session data...");

    // 1. Clear Cart Store
    useCartStore.getState().clearCart();

    // 2. Clear Favorites Store
    useFavoritesStore.setState({ favorites: [] });
    await SecureStore.deleteItemAsync('favorites-storage').catch(() => {});

    // 3. Clear Veg Type Store
    useVegTypeStore.getState().clearVegType();
    await SecureStore.deleteItemAsync('veg-type-store').catch(() => {});

    // 3.5. Clear Socket Store
    useSocketStore.getState().reset();

    // 4. Clear React Query Cache if provided
    if (queryClient) {
      queryClient.clear();
      console.log("✅ React Query cache cleared successfully!");
    }

    // 5. Clear Saved Theme and Auth session credentials
    await SecureStore.deleteItemAsync('user-theme').catch(() => {});
    await SecureStore.deleteItemAsync('better-auth_cookie').catch(() => {});
    await SecureStore.deleteItemAsync('token').catch(() => {});
    
    console.log("✅ All user session states wiped clean!");
  } catch (error) {
    console.error("❌ Error during user session cleanup:", error);
  }
}
