import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { AddressFormState, UserAddress } from "@/types/user";



export const useAddresses = () => {
    const queryClient = useQueryClient();

    // 1. Get all addresses
    return useQuery({
        queryKey: ["addresses"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/addresses");
            return data as UserAddress[];
        },
    });
};


// 2. Add a new address (The new mutation)
export const useAddAddress = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newAddress:AddressFormState) => {
            const { data } = await apiClient.post("/api/addresses", newAddress);
            return data as UserAddress; // Matches the 201 response schema
        },
        onSuccess: () => {
            // This is the magic of React Query: 
            // It automatically forces the 'useAddresses' hook to refetch 
            // so your FlatList updates instantly without a page reload.
            queryClient.invalidateQueries({ queryKey: ["addresses"] });
        },
    });
};