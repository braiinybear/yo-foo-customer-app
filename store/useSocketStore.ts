import { create } from 'zustand';

export interface DriverInfo {
  name: string;
  phone: string;
  vehiclePlate: string;
  profilePic: string;
}

export interface DriverLocation {
  orderId: string;
  driverProfileId?: string;
  lat: number;
  lng: number;
}

export interface OrderUpdate {
  orderId: string;
  status: string;
  timestamp: string;
}

export interface SocketState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Order tracking - for current active order
  currentOrderId: string | null;
  orderStatus: string | null;
  assignedDriver: DriverInfo | null;
  driverLocation: DriverLocation | null;

  // Track updates for all orders (by orderId)
  orderUpdates: Record<string, OrderUpdate>;

  // Methods
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  handleOrderStatusUpdate: (orderId: string, status: string) => void;
  handleDriverAssigned: (orderId: string, driver: DriverInfo) => void;
  handleOrderLocationUpdate: (location: DriverLocation) => void;
  getOrderStatus: (orderId: string) => string | null;
  reset: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  connectionError: null,
  currentOrderId: null,
  orderStatus: null,
  assignedDriver: null,
  driverLocation: null,
  orderUpdates: {},

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  handleOrderStatusUpdate: (orderId, status) =>
    set((state) => {
      const shouldClearDriver = !['PICKED_UP', 'ON_THE_WAY'].includes(status);

      return {
        currentOrderId: orderId,
        orderStatus: status,
        assignedDriver: shouldClearDriver ? null : state.assignedDriver,
        driverLocation: shouldClearDriver ? null : state.driverLocation,
        // Also track this update in orderUpdates for all orders
        orderUpdates: {
          ...state.orderUpdates,
          [orderId]: {
            orderId,
            status,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }),

  handleDriverAssigned: (orderId, driver) =>
    set({
      currentOrderId: orderId,
      assignedDriver: driver,
    }),

  handleOrderLocationUpdate: (location) =>
    set({
      currentOrderId: location.orderId,
      driverLocation: location,
    }),

  getOrderStatus: (orderId: string) => {
    const state = get();
    return state.orderUpdates[orderId]?.status || null;
  },

  reset: () =>
    set({
      isConnected: false,
      connectionError: null,
      currentOrderId: null,
      orderStatus: null,
      assignedDriver: null,
      driverLocation: null,
      orderUpdates: {},
    }),
}));
