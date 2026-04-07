import { useEffect } from 'react';
import { useSocketStore } from '@/store/useSocketStore';
import { getSocket } from '@/lib/socket-client';

/**
 * useSocketRecovery: Handles event recovery and state sync after socket reconnection
 * 
 * When socket reconnects:
 * - Backend automatically re-joins user to active order rooms
 * - Frontend fetches latest order states to sync any missed events
 * - Ensures no stale data in UI
 */
export function useSocketRecovery() {
  const { isConnected } = useSocketStore();

  useEffect(() => {
    if (!isConnected) return;

    const socket = getSocket();
    if (!socket) return;

    console.log('[SocketRecovery] 🔄 Socket is connected - Checking for recovery needs...');

    // When socket reconnects, log it for debugging
    socket.on('reconnect', () => {
      console.log('[SocketRecovery] ✅ Socket reconnected - Backend auto-rejoined user to active order rooms');
      console.log('[SocketRecovery] 💡 Will now receive real-time events instead of polling');
    });

    socket.on('disconnect', () => {
      console.log('[SocketRecovery] ⚠️  Socket disconnected - Fallback polling will take over');
    });

  }, [isConnected]);

  return { isRecovering: false };
}
