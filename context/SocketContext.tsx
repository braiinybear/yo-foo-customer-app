import { initSocket, getSocket } from "@/lib/socket-client";
import { useSocketStore } from "@/store/useSocketStore";
import { useSocketOrders } from "@/hooks/useSocketOrders";
import { useOrderPolling } from "@/hooks/useOrderPolling";
import { useSocketRecovery } from "@/hooks/useSocketRecovery";
import { User } from "@/types/user";
import { useEffect, ReactNode, useRef } from "react";

interface SocketProviderProps {
  children: ReactNode;
  user: User | undefined;
}

/**
 * SocketProvider: Manages socket lifecycle with reconnection & fallback support
 * 
 * Flow:
 * 1. User logs in → Socket initializes
 * 2. Socket connects → Listeners activate
 * 3. Socket disconnects → Auto-reconnection starts + fallback polling activates
 * 4. Socket reconnects → Switch back from polling to socket
 * 5. User logs out → Socket disconnects, cleanup runs
 */
export function SocketProvider({ children, user }: SocketProviderProps) {
  const { setConnected, setConnectionError } = useSocketStore();
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Register socket event listeners
  useSocketOrders();

  // ✅ Register fallback polling (activated when socket is disconnected)
  const { isPolling } = useOrderPolling(user);
  if (isPolling) {
    console.log('[SocketProvider] 📡 Fallback polling is ACTIVE');
  }

  // ✅ Register socket recovery (auto-rejoin rooms, sync state)
  useSocketRecovery();

  // Initialize socket connection when user logs in
  useEffect(() => {
    if (!user) {
      console.log("[SocketProvider] ⚠️  No user - Skipping socket initialization");
      return;
    }

    console.log("[SocketProvider] 👤 User logged in:", user.email);

    const currentState = useSocketStore.getState();
    if (currentState.isConnected) {
      console.log("[SocketProvider] ℹ️  Socket already connected - Skipping re-initialization");
      return;
    }

    console.log("[SocketProvider] 🔌 Initializing socket connection...");
    initSocket()
      .then(() => {
        setConnected(true);
        console.log('[SocketProvider] ✅ Socket connected successfully');

        const socket = getSocket();
        if (socket) {
          // Monitor disconnection
          socket.on('disconnect', () => {
            console.log('[SocketProvider] 🔴 Socket disconnected - fallback polling will activate');
            setConnected(false);
            
            // Try to reconnect after delay
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[SocketProvider] 🔄 Attempting auto-reconnect...');
              if (!socket.connected) {
                socket.connect();
              }
            }, 5000);
          });

          // Monitor reconnection
          socket.on('reconnect', () => {
            console.log('[SocketProvider] 🟢 Socket reconnected!');
            setConnected(true);
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
          });

          // Monitor errors
          socket.on('connect_error', (error) => {
            console.error('[SocketProvider] ❌ Connection error:', error?.message);
            setConnectionError(error?.message || 'Connection error');
          });
        }
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Socket connection failed';
        setConnectionError(errorMessage);
        console.error('[SocketProvider] ❌ Socket init error:', errorMessage);
        console.log('[SocketProvider] 📡 Fallback polling will activate for updates');
      });

    // Cleanup on user logout
    return () => {
      console.log("[SocketProvider] 👋 User logging out - Disconnecting socket");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      const state = useSocketStore.getState();
      if (state.isConnected) {
        const socket = getSocket();
        if (socket) {
          socket.disconnect();
          console.log("[SocketProvider] ✅ Socket disconnected");
        }
      }
    };
  }, [user, setConnected, setConnectionError]);

  return <>{children}</>;
}