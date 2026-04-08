import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSocketStore } from '@/store/useSocketStore';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { OrderDetails } from '@/types/orders';
import { getSocket, reconnectSocketIfNeeded } from '@/lib/socket-client';

/**
 * Hook that provides real-time status updates for a specific order
 * - Uses Socket.io when connected for instant updates ⚡
 * - Falls back to polling when socket is disconnected 🔄
 * - Automatically polls when app resumes from background
 * - Combines React Query data with real-time + fallback updates
 */
export function useOrderRealTimeUpdate(orderId: string | null | undefined) {
  console.log(`[RealTimeUpdate] 🚀 HOOK MOUNTED: orderId=${orderId}`);
  
  const [realTimeStatus, setRealTimeStatus] = useState<string | null>(null);
  console.log(`[RealTimeUpdate] 🔵 State initialized - realTimeStatus: ${realTimeStatus}`);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>('active');
  const [isFallbackPolling, setIsFallbackPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [wasBackgrounded, setWasBackgrounded] = useState(false);

  // ✅ Use a ref to avoid stale closure in fetchOrderStatusFromAPI
  const realTimeStatusRef = useRef<string | null>(null);
  realTimeStatusRef.current = realTimeStatus;

  const queryClient = useQueryClient();

  // Subscribe to socket store
  const socketStore = useSocketStore();
  const isSocketConnected = socketStore.isConnected;
  const storedStatus = socketStore.orderUpdates[orderId ?? '']?.status;
  
  // Log hook initialization
  useEffect(() => {
    console.log(`[RealTimeUpdate] 📋 Hook initialized with orderId: ${orderId}`);
    console.log(`[RealTimeUpdate]    Socket connected: ${isSocketConnected}`);
    console.log(`[RealTimeUpdate]    App state: ${appState}`);
  }, [orderId, isSocketConnected, appState]);

  // 🔔 LOG EVERY realTimeStatus CHANGE
  useEffect(() => {
    console.log(`[RealTimeUpdate] 🔔 realTimeStatus STATE CHANGED: ${realTimeStatus}`);
    // ✅ Invalidate order detail query so driver info + all data refreshes
    if (realTimeStatus && orderId) {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
    }
  }, [realTimeStatus, orderId, queryClient]);

  // ── Fetch order status from API (fallback) ──
  const fetchOrderStatusFromAPI = useCallback(
    async (id: string, retryCount = 0) => {
      const MAX_RETRIES = 3;
      try {
        console.log(`[RealTimeUpdate] 📡 Fetching status for ${id}... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        const { data } = await apiClient.get<OrderDetails>(`/api/orders/${id}`);

        // ✅ Use ref to get the CURRENT value, not a stale closure
        const currentStatus = realTimeStatusRef.current;
        console.log(`[RealTimeUpdate] 📡 API Response - Status: ${data.status}, Current Local: ${currentStatus}`);
        
        if (data.status !== currentStatus) {
          console.log(`[RealTimeUpdate] 📊 ✅ Status changed! Updating: ${currentStatus} → ${data.status}`);
          setRealTimeStatus(data.status);
          setIsUpdating(true);

          // Also update socket store so UI components see it
          socketStore.handleOrderStatusUpdate(id, data.status);

          setTimeout(() => setIsUpdating(false), 1500);
        } else {
          console.log(`[RealTimeUpdate] 📊 ℹ️  Status unchanged: ${data.status}`);
        }

        setPollError(null);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to fetch status';
        console.error(`[RealTimeUpdate] ❌ Fetch error:`, msg);
        
        // Retry logic for app resume (first few attempts)
        if (retryCount < MAX_RETRIES && msg.includes('Network')) {
          console.log(`[RealTimeUpdate] 🔄 Retrying in 2s... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            fetchOrderStatusFromAPI(id, retryCount + 1);
          }, 2000);
          return;
        }
        
        setPollError(msg);
      }
    },
    [socketStore]
  );

  // ── Handle app state changes (background/foreground) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    function handleAppStateChange(nextAppState: AppStateStatus) {
      console.log(`[RealTimeUpdate] 📱 App state changed: ${appState} → ${nextAppState}`);

      // Track when app was backgrounded
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log(`[RealTimeUpdate] 📱 App backgrounded - will START polling when fully backgrounded`);
        setWasBackgrounded(true);
      }

      // When app comes to foreground, RECONNECT SOCKET FIRST, then decide
      if (nextAppState === 'active' && orderId) {
        console.log(`[RealTimeUpdate] 📱 ✅ APP RESUMED FROM BACKGROUND - attempting socket reconnection`);
        
        // Try to reconnect socket immediately
        reconnectSocketIfNeeded();
        
        // Get socket to check status
        const currentSocket = getSocket();
        const socketConnected = currentSocket?.connected ?? false;
        
        console.log(`[RealTimeUpdate] 📱 Socket status after reconnect attempt: ${socketConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}`);
        console.log(`[RealTimeUpdate] 📱 Store isConnected: ${isSocketConnected}`);
        
        // 🔴 CHECK SOCKET STORE IMMEDIATELY for any cached status
        const cachedStatus = socketStore.orderUpdates[orderId]?.status;
        if (cachedStatus && cachedStatus !== realTimeStatus) {
          console.log(`[RealTimeUpdate] 📱 Found cached status in store: ${cachedStatus}`);
          console.log(`[RealTimeUpdate] 📱 Setting realTimeStatus from cache: ${cachedStatus}`);
          setRealTimeStatus(cachedStatus);
        }
        
        // Re-emit join to get current status from server (if connected)
        if (currentSocket?.connected) {
          console.log(`[RealTimeUpdate] 📱 Re-emitting join_order_tracking to get current status from server`);
          currentSocket.emit('join_order_tracking', orderId);
        }
        
        // Fetch fresh status from API with a small delay to give backend time to respond
        console.log(`[RealTimeUpdate] 📱 Will fetch latest status from API in 500ms...`);
        setIsUpdating(true);
        setTimeout(() => {
          console.log(`[RealTimeUpdate] 📱 Fetching latest status from API now...`);
          fetchOrderStatusFromAPI(orderId);
        }, 500);
        
        setWasBackgrounded(false);
      }

      setAppState(nextAppState);
    }

    return () => {
      subscription.remove();
    };
  }, [orderId, fetchOrderStatusFromAPI, wasBackgrounded, appState, isSocketConnected]);

  // ── Initial Socket Room Join ──
  useEffect(() => {
    if (orderId && isSocketConnected) {
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log(`[RealTimeUpdate] 🔌 Joining order tracking room for: ${orderId}`);
        socket.emit('join_order_tracking', orderId);
      }
    }
  }, [orderId, isSocketConnected]);

  // ── Real-time socket updates (priority) ──
  useEffect(() => {
    if (!orderId) {
      console.log(`[RealTimeUpdate] ⚠️  No orderId, skipping socket update check`);
      return;
    }

    const orderUpdate = socketStore.orderUpdates[orderId];
    console.log(`[RealTimeUpdate] 🔍 Socket update effect fired`);
    console.log(`[RealTimeUpdate]    orderId: ${orderId}`);
    console.log(`[RealTimeUpdate]    storedStatus in store: ${orderUpdate?.status}`);
    console.log(`[RealTimeUpdate]    currentRealTimeStatus: ${realTimeStatus}`);
    
    if (orderUpdate?.status) {
      console.log(`[RealTimeUpdate] ✅ Found status in store: ${orderUpdate.status}`);
      
      if (orderUpdate.status !== realTimeStatus) {
        console.log(`[RealTimeUpdate] ⚡ SOCKET UPDATE DETECTED! ${realTimeStatus} → ${orderUpdate.status}`);
        console.log(`[RealTimeUpdate]    Calling setRealTimeStatus(${orderUpdate.status})`);
        setRealTimeStatus(orderUpdate.status);
        setIsUpdating(true);
        setPollError(null);

        const timer = setTimeout(() => setIsUpdating(false), 1500);
        return () => clearTimeout(timer);
      } else {
        console.log(`[RealTimeUpdate] ℹ️  Socket status same as current: ${orderUpdate.status}`);
      }
    } else {
      console.log(`[RealTimeUpdate] ℹ️  No status in store for orderId: ${orderId}`);
    }
  }, [orderId, realTimeStatus, socketStore.orderUpdates]);

  // ── Fallback polling when socket disconnected OR app is background ──
  useEffect(() => {
    if (!orderId) {
      if (isFallbackPolling) {
        console.log(`[RealTimeUpdate] ⏹️  Stopping fallback poll (no orderId)`);
        setIsFallbackPolling(false);
      }
      return;
    }

    // ✅ POLL LOGIC:
    // - If app is BACKGROUND → Poll always (socket might be paused)
    // - If app is FOREGROUND → Poll only if socket disconnected
    const shouldPoll = appState !== 'active' || !isSocketConnected;

    if (!shouldPoll) {
      if (isFallbackPolling) {
        console.log(`[RealTimeUpdate] ⏹️  Stopping fallback poll (socket=${isSocketConnected}, app=${appState})`);
        setIsFallbackPolling(false);
      }
      return;
    }

    console.log(`[RealTimeUpdate] 🔄 Starting fallback poll for ${orderId} (app=${appState}, socket=${isSocketConnected})`);
    setIsFallbackPolling(true);

    // Immediate first fetch
    fetchOrderStatusFromAPI(orderId);

    // Poll every 30 seconds as a last-resort fallback when socket is disconnected
    const pollInterval = setInterval(() => {
      console.log(`[RealTimeUpdate] 🔄 Poll tick for ${orderId} (app=${appState}, socket=${isSocketConnected})`);
      fetchOrderStatusFromAPI(orderId);
    }, 30000);

    return () => {
      console.log(`[RealTimeUpdate] ⏹️  Clearing poll interval`);
      clearInterval(pollInterval);
    };
  }, [orderId, isSocketConnected, appState, fetchOrderStatusFromAPI, isFallbackPolling]);

  return {
    realTimeStatus,
    isUpdating,
    isFallbackPolling,
    pollError,
    connectionStatus: isSocketConnected ? 'connected' : 'polling',
  };
}
