import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { UserOrder, CreateOrderPayload } from "@/types/orders";

export const useOrders = () => {
    return useQuery({
        queryKey: ["orders", "history"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/orders/my-history");
            return data as UserOrder[];
        },
    });
};

export const useOrderDetail = (orderId: string) => {
    return useQuery({
        queryKey: ["orders", orderId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/orders/${orderId}`);
            return data as UserOrder;
        },
        enabled: !!orderId,
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateOrderPayload) => {
            console.log(payload);
            
            const { data } = await apiClient.post("/api/orders", payload);
            return data as UserOrder;
        },
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
};