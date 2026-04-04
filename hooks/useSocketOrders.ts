import { useEffect } from "react";
import { useSocketStore } from "@/store/useSocketStore";
import { getSocket } from "@/lib/socket-client";

export function useSocketOrders() {
  const updateOrderStatus = useSocketStore((state) => state.updateOrderStatus);
  const updateDriverLocation = useSocketStore(
    (state) => state.updateDriverLocation,
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for order status updates
    socket.on("order_status_update", (data) => {
      console.log("[Customer] Order Status:", data);
      updateOrderStatus(data);
    });

    // Listen for driver location updates
    socket.on("order_location_update", (data) => {
      console.log("[Customer] Driver Location:", data);
      updateDriverLocation(data);
    });

    return () => {
      socket.off("order_status_update");
      socket.off("order_location_update");
    };
  }, [updateOrderStatus, updateDriverLocation]);
}

export function useOrderTracking(orderId: string | null) {
  const { setCurrentOrder } = useSocketStore();
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join order tracking room
    socket.emit("join_order_tracking", orderId);
    setCurrentOrder(orderId);

    console.log(`[Customer] Joined tracking for order: ${orderId}`);

    return () => {
      // Leave room when component unmounts
      socket.emit("leave_order_tracking", orderId);
      setCurrentOrder(null);
    };
  }, [orderId, socket, setCurrentOrder]);
}
