import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { UserOrder, CreateOrderPayload, OrderDetails, CurrentOrder } from "@/types/orders";

export const useCurrentOrder = () => {
    return useQuery({
        queryKey: ["orders", "current"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/orders/current");
            return data as CurrentOrder;
        },
        retry: 1,
    });
};

export const useOrders = (page: number = 1, limit: number = 5) => {
    return useQuery({
        queryKey: ["orders", "history", page, limit],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/orders/my-history", {
                params: { page, limit },
            });
            return data;
        },
    });
};

export const useOrderDetail = (orderId: string) => {
    return useQuery({
        queryKey: ["orders", orderId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/orders/${orderId}`);
            return data as OrderDetails;
        },
        enabled: !!orderId,
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateOrderPayload) => {
            const { data } = await apiClient.post("/api/orders", payload);
            return data as UserOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            // Refresh wallet balance in case WALLET payment was used
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
        },
    });
}; 