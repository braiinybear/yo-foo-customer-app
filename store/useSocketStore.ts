import { create } from 'zustand';

export interface DriverLocation {
  lat: number;
  lng: number;
  orderId: string;
  timestamp: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: string;
  timestamp: string;
}

interface SocketState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Order tracking
  currentOrderId: string | null;
  orderStatus: string | null;
  driverLocation: DriverLocation | null;

  // Methods
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setCurrentOrder: (orderId: string | null) => void;
  updateOrderStatus: (status: OrderStatusUpdate) => void;
  updateDriverLocation: (location: DriverLocation) => void;
  reset: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  connectionError: null,
  currentOrderId: null,
  orderStatus: null,
  driverLocation: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  setCurrentOrder: (orderId) =>
    set({
      currentOrderId: orderId,
      driverLocation: null,
      orderStatus: null,
    }),

  updateOrderStatus: (update) =>
    set({
      orderStatus: update.status,
    }),

  updateDriverLocation: (location) =>
    set({
      driverLocation: location,
    }),

  reset: () =>
    set({
      isConnected: false,
      connectionError: null,
      currentOrderId: null,
      orderStatus: null,
      driverLocation: null,
    }),
}));
