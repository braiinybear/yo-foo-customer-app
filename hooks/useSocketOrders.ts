import { useEffect } from "react";
import { useSocketStore } from "@/store/useSocketStore";
import { getSocket } from "@/lib/socket-client";

/**
 * useSocketOrders: Registers socket event listeners for order updates
 * Listens for:
 * - order_status_update: When restaurant updates order status
 * - driver_assigned: When driver is assigned to order
 * - order_location_update: Real-time driver location tracking
 *
 * Automatically retries when socket becomes available.
 */
export function useSocketOrders() {
  const handleOrderStatusUpdate = useSocketStore(
    (state) => state.handleOrderStatusUpdate,
  );
  const handleDriverAssigned = useSocketStore(
    (state) => state.handleDriverAssigned,
  );
  const handleOrderLocationUpdate = useSocketStore(
    (state) => state.handleOrderLocationUpdate,
  );
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) {
      console.log("[Customer] Socket not ready yet - waiting for connection...");
      return;
    }

    console.log("[Customer] Socket initialized, registering listeners...");

    const onOrderStatusUpdate = (data: {
      orderId: string;
      status: string;
      timestamp?: string;
    }) => {
      handleOrderStatusUpdate(data.orderId, data.status);
    };

    const onDriverAssigned = (data: {
      orderId: string;
      driver: {
        name: string;
        phone: string;
        vehiclePlate: string;
        profilePic: string;
      };
    }) => {
      handleDriverAssigned(data.orderId, data.driver);
    };

    const onOrderLocationUpdate = (data: {
      orderId: string;
      driverProfileId?: string;
      lat: number;
      lng: number;
    }) => {
      handleOrderLocationUpdate({
        orderId: data.orderId,
        driverProfileId: data.driverProfileId,
        lat: data.lat,
        lng: data.lng,
      });
    };

    socket.on("order_status_update", onOrderStatusUpdate);
    socket.on("driver_assigned", onDriverAssigned);
    socket.on("order_location_update", onOrderLocationUpdate);

    return () => {
      socket.off("order_status_update", onOrderStatusUpdate);
      socket.off("driver_assigned", onDriverAssigned);
      socket.off("order_location_update", onOrderLocationUpdate);
    };
  }, [
    isConnected,
    handleOrderStatusUpdate,
    handleDriverAssigned,
    handleOrderLocationUpdate,
  ]);
}

/**
 * useOrderTracking: Manages socket room subscription for specific order.
 * Joins room when order is viewed, leaves when closed.
 */
export function useOrderTracking(orderId: string | null) {
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {
    if (!isConnected) {
      console.log(
        "[Customer] Socket not connected yet - waiting before joining room",
      );
      return;
    }

    const socket = getSocket();
    if (!socket) {
      console.log("[Customer] Socket not initialized - cannot join room");
      return;
    }

    if (!orderId) {
      console.log("[Customer] No order ID provided - skipping room join");
      return;
    }

    socket.emit("join_order_tracking", orderId);

    return () => {
      socket.emit("leave_order_tracking", orderId);
    };
  }, [orderId, isConnected]);
}
