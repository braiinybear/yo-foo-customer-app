import { useEffect, useRef } from 'react';
import { useSocketStore } from '@/store/useSocketStore';
import apiClient from '@/lib/axios';

/**
 * useOrderPolling: Fallback polling when socket is disconnected
 * 
 * When socket is DOWN:
 * - Polls API every 10 seconds for order status updates
 * - Tracks all active orders via orderUpdates store
 * 
 * When socket is UP:
 * - Stops polling (socket handles real-time updates)
 */
export function useOrderPolling() {
  const { 
    isConnected, 
    orderUpdates,
    handleOrderStatusUpdate,
    handleDriverAssigned,
  } = useSocketStore();

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // If socket is connected, don't poll
    if (isConnected) {
      if (pollingIntervalRef.current) {
        console.log('[Customer OrderPolling] 🔌 Socket connected - Stopping polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Socket is disconnected - Start polling for all active orders
    const activeOrderIds = Object.keys(orderUpdates).filter(
      (orderId) => {
        const status = orderUpdates[orderId]?.status;
        return status && !['DELIVERED', 'CANCELLED', 'REFUSED'].includes(status);
      }
    );

    if (activeOrderIds.length === 0) {
      console.log('[Customer OrderPolling] ℹ️  No active orders to poll');
      return;
    }

    console.log(`[Customer OrderPolling] 📡 Socket disconnected - Polling ${activeOrderIds.length} active order(s) (every 10s)`);

    const pollOrders = async () => {
      for (const orderId of activeOrderIds) {
        try {
          const response = await apiClient.get(`/api/orders/${orderId}`);
          const order = response.data?.data;

          if (!order) continue;

          // Check if status changed
          const previousStatus = lastStatusRef.current[orderId];
          if (order.status !== previousStatus) {
            console.log(`[Customer OrderPolling] 📦 Status changed for ${orderId}: ${order.status}`);
            handleOrderStatusUpdate(orderId, order.status);
            lastStatusRef.current[orderId] = order.status;
          }

          // Check if driver was assigned
          if (order.driverId && order.driver) {
            const driver = order.driver;
            handleDriverAssigned(orderId, {
              name: driver.name,
              phone: driver.phone,
              vehiclePlate: driver.vehiclePlate,
              profilePic: driver.profilePic,
            });
            console.log(`[Customer OrderPolling] 🚗 Driver assigned for ${orderId}`);
          }

        } catch (error) {
          console.error(`[Customer OrderPolling] ❌ Error polling ${orderId}:`, error instanceof Error ? error.message : error);
        }
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(pollOrders, 10000); // Poll every 10s

    // Initial poll
    pollOrders();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isConnected, orderUpdates, handleOrderStatusUpdate, handleDriverAssigned]);

  return {
    isPolling: !isConnected,
    activeOrderCount: Object.keys(orderUpdates).length,
  };
}
