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
 * ✅ Automatically retries when socket becomes available
 */
export function useSocketOrders() {
  const handleOrderStatusUpdate = useSocketStore((state) => state.handleOrderStatusUpdate);
  const handleDriverAssigned = useSocketStore((state) => state.handleDriverAssigned);
  const handleOrderLocationUpdate = useSocketStore((state) => state.handleOrderLocationUpdate);
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) {
      console.log("[Customer] ⏳ Socket not ready yet - Waiting for connection...");
      return;
    }

    console.log("[Customer] ✅ Socket initialized, registering listeners...");
    console.log("[Customer] 👂 Listening for: order_status_update, driver_assigned, order_location_update");

    // ============================================
    // EVENT 1: Order Status Updates
    // ============================================
    socket.on("order_status_update", (data) => {
      console.log("[Customer] 📦 [EVENT] Order Status Update Received");
      console.log("[Customer]    Order ID:", data.orderId);
      console.log("[Customer]    New Status:", data.status);
      console.log("[Customer]    Timestamp:", data.timestamp);
      console.log("[Customer]    📍 Source: Backend (could be join response or real-time update)");
      console.log("[Customer] 🔄 Updating local state...");
      handleOrderStatusUpdate(data.orderId, data.status);
      console.log("[Customer] ✅ Status update processed - Local store updated");
    });

    // ============================================
    // EVENT 2: Driver Assigned
    // ============================================
    socket.on("driver_assigned", (data) => {
      console.log("[Customer] 🚗 [EVENT] Driver Assigned");
      console.log("[Customer]    Order ID:", data.orderId);
      console.log("[Customer]    Driver Name:", data.driver?.name);
      console.log("[Customer]    Driver Phone:", data.driver?.phone);
      console.log("[Customer]    Vehicle Plate:", data.driver?.vehiclePlate);
      console.log("[Customer] 🔄 Updating local state...");
      handleDriverAssigned(data.orderId, data.driver);
      console.log("[Customer] ✅ Driver assignment processed");
    });

    // ============================================
    // EVENT 3: Driver Location Tracking
    // ============================================
    socket.on("order_location_update", (data) => {
      console.log("[Customer] 📍 [EVENT] Driver Location Update");
      console.log("[Customer]    Driver ID:", data.driverProfileId);
      console.log("[Customer]    Latitude:", data.lat);
      console.log("[Customer]    Longitude:", data.lng);
      console.log("[Customer] 🔄 Updating location state...");
      handleOrderLocationUpdate({
        driverProfileId: data.driverProfileId,
        lat: data.lat,
        lng: data.lng,
      });
      console.log("[Customer] ✅ Location update processed");
    });

    // Cleanup
    return () => {
      console.log("[Customer] 🧹 Cleaning up socket listeners - Component unmounting");
      socket.off("order_status_update");
      socket.off("driver_assigned");
      socket.off("order_location_update");
      console.log("[Customer] ✅ Listeners cleaned up");
    };
  }, [isConnected, handleOrderStatusUpdate, handleDriverAssigned, handleOrderLocationUpdate]);
}

/**
 * useOrderTracking: Manages socket room subscription for specific order
 * Joins room when order is viewed, leaves when closed
 */
export function useOrderTracking(orderId: string | null) {
  const socket = getSocket();

  useEffect(() => {
    if (!socket) {
      console.log("[Customer] ⚠️  Socket not initialized - Cannot join room");
      return;
    }

    if (!orderId) {
      console.log("[Customer] ⚠️  No order ID provided - Skipping room join");
      return;
    }

    console.log(`[Customer] 🚪 Joining order tracking room: order_${orderId}`);
    // Join order tracking room for real-time updates specific to this order
    socket.emit("join_order_tracking", orderId);
    console.log(`[Customer] ✅ Emitted join_order_tracking for order: ${orderId}`);
    console.log(`[Customer]    Backend will respond with current status via order_status_update event`);

    return () => {
      console.log(`[Customer] 🚪 Leaving order tracking room: order_${orderId}`);
      // Leave room when component unmounts
      socket.emit("leave_order_tracking", orderId);
      console.log(`[Customer] ✅ Successfully left room for order: ${orderId}`);
    };
  }, [orderId, socket]);
}
