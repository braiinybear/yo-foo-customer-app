import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

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

export type VegType = "veg" | "non-veg" | "vegan" | null;

interface VegTypeState {
    selectedVegType: VegType;
    setSelectedVegType: (type: VegType) => void;
    clearVegType: () => void;
}

export const useVegTypeStore = create<VegTypeState>()(
    persist(
        (set) => ({
            selectedVegType: null,

            setSelectedVegType: (type) => {
                set({ selectedVegType: type });
            },

            clearVegType: () => {
                set({ selectedVegType: null });
            },
        }),
        {
            name: 'veg-type-store',
            storage: createJSONStorage(() => secureStorage),
        },
    ),
);
