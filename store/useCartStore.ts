import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { MenuItem } from '@/types/restaurants';

// Custom storage wrapper for SecureStore
const secureStorage = {
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

export interface CartItem extends MenuItem {
    quantity: number;
}

interface CartState {
    items: CartItem[];
    restaurantId: string | null;
    totalAmount: number;
    addItem: (item: MenuItem, restaurantId: string) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
}

const calculateTotal = (items: CartItem[]) => {
    return items.reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0);
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            restaurantId: null,
            totalAmount: 0,

            addItem: (item, restaurantId) => {
                const currentItems = get().items;
                const currentRestaurantId = get().restaurantId;
                let newItems: CartItem[] = [];

                if (currentRestaurantId && currentRestaurantId !== restaurantId) {
                    newItems = [{ ...item, quantity: 1 }];
                } else {
                    const existingItem = currentItems.find((i) => i.id === item.id);
                    if (existingItem) {
                        newItems = currentItems.map((i) =>
                            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                        );
                    } else {
                        newItems = [...currentItems, { ...item, quantity: 1 }];
                    }
                }

                set({
                    items: newItems,
                    restaurantId,
                    totalAmount: calculateTotal(newItems)
                });
            },

            removeItem: (itemId) => {
                const newItems = get().items.filter((i) => i.id !== itemId);
                set({
                    items: newItems,
                    totalAmount: calculateTotal(newItems),
                    restaurantId: newItems.length === 0 ? null : get().restaurantId
                });
            },

            updateQuantity: (itemId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(itemId);
                    return;
                }
                const newItems = get().items.map((i) =>
                    i.id === itemId ? { ...i, quantity } : i
                );
                set({
                    items: newItems,
                    totalAmount: calculateTotal(newItems)
                });
            },

            clearCart: () => set({ items: [], restaurantId: null, totalAmount: 0 }),
        }),
        {
            name: 'food-cart-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);
