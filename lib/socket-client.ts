import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { parseCookieBlob } from './axios';
import { useSocketStore } from '@/store/useSocketStore';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL
const BETTER_AUTH_COOKIE_KEY = 'better-auth_cookie';


let socket: Socket | null = null;

export async function initSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    // socket is already connected and initialized
    return socket;
  }

  try {
    const cookieBlob = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
    const cookieHeader = parseCookieBlob(cookieBlob);

    // [Socket] 🔌 Initializing socket connection...
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
      // UPDATE STORE: Socket is connected
      useSocketStore.setState({ isConnected: true, connectionError: null });
      // [Socket] ✅ Store updated: isConnected = true'
    });

    socket.on('disconnect', (reason) => {
      // 🔴 UPDATE STORE: Socket is disconnected
      useSocketStore.setState({ isConnected: false, connectionError: reason });
      // console.log(`[Socket] ✅ Store updated: isConnected = false (reason: ${reason})`);
      // console.log('[Socket] ℹ️  Auto-reconnection will start, fallback polling activates');
    });

    socket.on('reconnect_attempt', (attempt) => {
      // console.log(`🔄 [Socket] Reconnect attempt ${attempt}...`);
    });

    socket.on('reconnect', () => {
      // 🔴 UPDATE STORE: Socket reconnected
      useSocketStore.setState({ isConnected: true, connectionError: null });
      // [Socket] ✅ Store updated: isConnected = true (reconnected)
    });

    socket.on('connect_error', (error) => {
      // 🔴 UPDATE STORE: Connection error
      useSocketStore.setState({
        isConnected: false,
        connectionError: error?.message || 'Connection error'
      });
      // [Socket] ✅ Store updated: connectionError set
    });

    return socket;
  } catch (error) {
    // console.error('[Socket] ❌ Init Error:', error instanceof Error ? error.message : error);
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
