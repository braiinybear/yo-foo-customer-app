import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync";
import * as Notifications from "expo-notifications";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useGetPushToken,
  useRegisterPushToken,
  useUpdatePushToken,
} from "@/hooks/useExpoPushNotication";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";

interface NotificationContextType {
  pushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
  handleNotificationNavigation?: (data: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [expopushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { mutateAsync: registerPushToken } = useRegisterPushToken();
  const { mutateAsync: updatePushToken } = useUpdatePushToken();
  
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;
  
  const { data: serverPushToken } = useGetPushToken(isAuthenticated);

  // Keep track of auth status via ref for event listener callbacks
  const isAuthenticatedRef = useRef(isAuthenticated);
  const pendingNavigationRef = useRef<any>(null);
  const lastProcessedRef = useRef<{ id?: string; screen?: string; time: number } | null>(null);

  // Update ref whenever authentication state changes
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    if (isAuthenticated && pendingNavigationRef.current) {
      const pendingData = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      console.log("📲 Customer authenticated, routing pending notification:");
      setTimeout(() => {
        handleNotificationNavigation(pendingData);
      }, 800);
    }
  }, [isAuthenticated]);

  // Centralized notification router helper
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    const id = (data.id || data.orderId || data.restaurantId) as string | undefined;
    const screen = (data.screen || data.type) as string | undefined;

    console.log("📲 Routing customer notification:", { screen, id, data });

    // Prevent duplicate triggers within 2 seconds
    const now = Date.now();
    if (
      lastProcessedRef.current &&
      lastProcessedRef.current.id === id &&
      lastProcessedRef.current.screen === screen &&
      now - lastProcessedRef.current.time < 2000
    ) {
      console.log("📲 Ignoring duplicate notification tap");
      return;
    }
    lastProcessedRef.current = { id, screen, time: now };

    if (!isAuthenticatedRef.current) {
      console.log("📲 User is not authenticated. Redirecting to Login and deferring route.");
      pendingNavigationRef.current = data;
      router.replace("/(auth)/login");
      return;
    }

    // Determine target based on screen/type payload
    if (
      screen === "OrderDetails" || 
      screen === "order_created" || 
      screen === "delivery_status" || 
      data.orderId
    ) {
      if (id) {
        router.navigate("/(tabs)/orders");
        setTimeout(() => {
          router.push(`/(tabs)/orders/${id}`);
        }, 100);
      } else {
        router.navigate("/(tabs)/orders");
      }
    } else if (screen === "Chat" || screen === "chat") {
      // In customer app, chat is managed inline on the order details page
      if (id) {
        router.navigate("/(tabs)/orders");
        setTimeout(() => {
          router.push(`/(tabs)/orders/${id}`);
        }, 100);
      } else {
        router.navigate("/(tabs)/orders");
      }
    } else if (
      screen === "Offer" || 
      screen === "Product" || 
      screen === "offer" || 
      data.restaurantId
    ) {
      if (id) {
        router.push(`/restaurants/${id}`);
      } else {
        router.navigate("/(tabs)");
      }
    } else {
      // Missing or invalid payload -> go to Home screen
      router.navigate("/(tabs)");
    }
  };

  // Standalone mount effect to listen for notification events early, handling terminated state
  useEffect(() => {
    let isMounted = true;

    // Listen for foreground notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📲 Notification received in foreground:", notification);
        setNotification(notification);
      });

    // Listen for notification taps when the app is backgrounded/foregrounded
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("📲 User tapped notification:", data);
        handleNotificationNavigation(data);
      });

    // Check if app was launched by tapping a notification (terminated state)
    try {
      const response = Notifications.getLastNotificationResponse();
      if (response && isMounted) {
        const data = response.notification.request.content.data;
        console.log("📲 App opened via notification tap (terminated):", data);
        setTimeout(() => {
          handleNotificationNavigation(data);
        }, 1000);
      }
    } catch (e) {
      console.log("Error getting last notification response:", e);
    }

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Separate effect to handle push token setup & registration sync
  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated) return;

    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("⚠️ Notification permission not granted");
          return;
        }

        const token = await registerForPushNotificationsAsync();
        
        if (!isMounted) return;

        if (token) {
          setExpoPushToken(token);
          try {
            if (!serverPushToken?.pushToken) {
              await registerPushToken({ token });
            }
            else if (serverPushToken?.pushToken !== token) {
              await updatePushToken({ token });
            }
          } catch (err) {
            console.log("❌ Failed to sync push token:", err);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, registerPushToken, serverPushToken?.pushToken, updatePushToken]);

  return (
    <NotificationContext.Provider
      value={{
        pushToken: expopushToken,
        notification,
        error,
        handleNotificationNavigation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
