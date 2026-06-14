import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MenuItem, MenuVariant, AddonOption } from '@/types/restaurants';

export interface CartItem extends MenuItem {
    quantity: number;
    selectedVariant?: MenuVariant;
    selectedAddons?: AddonOption[];
    customUniqueId?: string; // composite key to support multiple configurations of the same dish
}

interface CartState {
    items: CartItem[];
    restaurantId: string | null;
    totalAmount: number;
    addItem: (
        item: MenuItem, 
        restaurantId: string, 
        selectedVariant?: MenuVariant, 
        selectedAddons?: AddonOption[],
        quantity?: number
    ) => void;
    removeItem: (cartItemKey: string) => void;
    updateQuantity: (cartItemKey: string, quantity: number) => void;
    clearCart: () => void;
}

export const getCartItemKey = (item: MenuItem, variant?: MenuVariant, addons?: AddonOption[]) => {
    const variantPart = variant ? variant.id : 'default';
    const addonPart = addons && addons.length > 0
        ? addons.map(a => a.id).sort().join(',')
        : 'none';
    return `${item.id}-${variantPart}-${addonPart}`;
};

export const getCartItemPrice = (item: CartItem) => {
    let basePrice = 0;
    if (item.selectedVariant) {
        basePrice = item.selectedVariant.price;
    } else if (item.variants && item.variants.length > 0) {
        const defaultVar = item.variants.find(v => v.isDefault) ?? item.variants[0];
        basePrice = defaultVar.price;
    } else {
        basePrice = item.price ?? 0;
    }
    const addonsPrice = item.selectedAddons
        ? item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
        : 0;
    return basePrice + addonsPrice;
};

const calculateTotal = (items: CartItem[]) => {
    return items.reduce((total, item) => total + getCartItemPrice(item) * (item.quantity || 0), 0);
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            restaurantId: null,
            totalAmount: 0,

            addItem: (item, restaurantId, selectedVariant, selectedAddons, qty = 1) => {
                const currentItems = get().items;
                const currentRestaurantId = get().restaurantId;
                let newItems: CartItem[] = [];

                // Auto-select the default variant if not provided but variants exist
                let finalVariant = selectedVariant;
                if (!finalVariant && item.variants && item.variants.length > 0) {
                    finalVariant = item.variants.find(v => v.isDefault) ?? item.variants[0];
                }

                // Generate composite unique key
                const uniqueKey = getCartItemKey(item, finalVariant, selectedAddons);
                
                // Calculate item price for backward-compatibility storage
                const basePrice = finalVariant ? finalVariant.price : (item.price ?? 0);
                const addonsPrice = selectedAddons ? selectedAddons.reduce((sum, a) => sum + a.price, 0) : 0;
                const computedPrice = basePrice + addonsPrice;

                const newCartItem: CartItem = {
                    ...item,
                    price: computedPrice, // Set computed price directly to support backward compatibility seamlessly
                    quantity: qty,
                    selectedVariant: finalVariant,
                    selectedAddons,
                    customUniqueId: uniqueKey,
                };

                if (currentRestaurantId && currentRestaurantId !== restaurantId) {
                    newItems = [newCartItem];
                } else {
                    const existingItem = currentItems.find((i) => (i.customUniqueId ?? i.id) === uniqueKey);
                    if (existingItem) {
                        newItems = currentItems.map((i) =>
                            (i.customUniqueId ?? i.id) === uniqueKey ? { ...i, quantity: i.quantity + qty } : i
                        );
                    } else {
                        newItems = [...currentItems, newCartItem];
                    }
                }

                set({
                    items: newItems,
                    restaurantId,
                    totalAmount: calculateTotal(newItems)
                });
            },

            removeItem: (cartItemKey) => {
                const newItems = get().items.filter((i) => (i.customUniqueId ?? i.id) !== cartItemKey);
                set({
                    items: newItems,
                    totalAmount: calculateTotal(newItems),
                    restaurantId: newItems.length === 0 ? null : get().restaurantId
                });
            },

            updateQuantity: (cartItemKey, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(cartItemKey);
                    return;
                }
                const newItems = get().items.map((i) =>
                    (i.customUniqueId ?? i.id) === cartItemKey ? { ...i, quantity } : i
                );
                set({
                    items: newItems,
                    totalAmount: calculateTotal(newItems)
                });
            },

            clearCart: () => {
                // Clear state
                set({ items: [], restaurantId: null, totalAmount: 0 });
                // Explicitly remove from AsyncStorage to ensure complete cleanup
                AsyncStorage.removeItem('food-cart-storage').catch(console.error);
            },
        }),
        {
            name: 'food-cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
