import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";



export const useAddresses = () => {
    const queryClient = useQueryClient();

    // 1. Get all addresses
    return useQuery({
        queryKey: ["addresses"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/addresses");
            return data;
        },
    });
};
