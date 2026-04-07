import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { parseCookieBlob } from './axios';
import { useSocketStore } from '@/store/useSocketStore';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BETTER_AUTH_COOKIE_KEY = 'better-auth_cookie';


let socket: Socket | null = null;

export async function initSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    console.log('[Socket] ℹ️  Socket already connected');
    return socket;
  }

  try {
    // Get the Better Auth cookie blob (same source as axios)
    const cookieBlob = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
    const cookieHeader = parseCookieBlob(cookieBlob);

    console.log('[Socket] 🔌 Initializing socket connection...');
    socket = io(SOCKET_URL, {
      // Send cookies as headers (same as HTTP requests)
      extraHeaders: {
        Cookie: cookieHeader,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 15,  // ⬆️ Increased attempts for better resilience
      transports: ['websocket', 'polling'],  // ⬆️ Add polling fallback
    });

    socket.on('connect', () => {
      console.log('🟢 [Socket] Connected:', socket?.id);
      // 🔴 UPDATE STORE: Socket is connected
      useSocketStore.setState({ isConnected: true, connectionError: null });
      console.log('[Socket] ✅ Store updated: isConnected = true');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 [Socket] Disconnected - Reason:', reason);
      // 🔴 UPDATE STORE: Socket is disconnected
      useSocketStore.setState({ isConnected: false, connectionError: reason });
      console.log(`[Socket] ✅ Store updated: isConnected = false (reason: ${reason})`);
      console.log('[Socket] ℹ️  Auto-reconnection will start, fallback polling activates');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [Socket] Reconnect attempt ${attempt}...`);
    });

    socket.on('reconnect', () => {
      console.log('🟢 [Socket] Successfully reconnected!');
      // 🔴 UPDATE STORE: Socket reconnected
      useSocketStore.setState({ isConnected: true, connectionError: null });
      console.log('[Socket] ✅ Store updated: isConnected = true (reconnected)');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket] Connection Error:', error?.message || error);
      // 🔴 UPDATE STORE: Connection error
      useSocketStore.setState({ 
        isConnected: false, 
        connectionError: error?.message || 'Connection error' 
      });
      console.log('[Socket] ✅ Store updated: connectionError set');
    });

    return socket;
  } catch (error) {
    console.error('[Socket] ❌ Init Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Try to reconnect if socket is not connected
 * Called when app resumes from background
 */
export function reconnectSocketIfNeeded(): void {
  if (socket) {
    if (!socket.connected) {
      console.log('[Socket] 🔌 Attempting to reconnect (app resumed from background)');
      socket.connect();
    } else {
      console.log('[Socket] ✅ Socket already connected');
    }
  } else {
    console.log('[Socket] ⚠️  Socket not initialized yet');
  }
}
