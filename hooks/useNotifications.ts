import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/axios";
import { NotificationsResponse } from "@/types/notifications";

const NOTIFICATIONS_LIMIT = 20;

/**
 * Hook to fetch paginated notification history for the current user.
 * Uses infinite query for seamless scrolling.
 */
export const useNotifications = () => {
    return useInfiniteQuery<NotificationsResponse>({
        queryKey: ["notifications"],
        queryFn: async ({ pageParam }) => {
            const { data } = await apiClient.get("/api/notifications", {
                params: { 
                    page: pageParam, 
                    limit: NOTIFICATIONS_LIMIT 
                },
            });
            return data as NotificationsResponse;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            // Check if there are more pages based on total and current limit
            const { page, limit, total } = lastPage;
            const hasNextPage = page * limit < total;
            return hasNextPage ? page + 1 : undefined;
        },
    });
};

/**
 * Hook to mark a specific notification as read.
 */
export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data } = await apiClient.patch(`/api/notifications/${notificationId}/read`);
            return data;
        },
        onSuccess: () => {
            // Invalidate notifications to refresh unreadCount and list state
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
};

/**
 * Hook to mark all notifications as read for the current user.
 */
export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.patch("/api/notifications/read-all");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
};
