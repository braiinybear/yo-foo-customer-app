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

  useEffect(() => {
    let isMounted = true;
    
    // Do not request or sync push tokens if the user is not logged in!
    if (!isAuthenticated) return;

    const setupNotifications = async () => {
      try {
        // Check and request notification permissions if not granted
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
            // First time opening app - register token
            if (!serverPushToken?.pushToken) {
              await registerPushToken({ token });
            }
            // Token changed on subsequent opens - update token
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

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received app is running:", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const orderId = data?.orderId as string | undefined;

        console.log("📲 User tapped notification, orderId:", orderId);

        if (orderId) {
          // Navigate to orders tab first, then push order detail
          // This ensures the back stack is: Home → Orders List → Order Detail
          setTimeout(() => {
            router.navigate("/(tabs)/orders");
            // Small extra delay so the orders tab mounts before we push the detail
            setTimeout(() => {
              router.push(`/(tabs)/orders/${orderId}`);
            }, 100);
          }, 300);
        }
      });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [expopushToken, isAuthenticated, registerPushToken, serverPushToken?.pushToken, updatePushToken]);

  return (
    <NotificationContext.Provider
      value={{ pushToken: expopushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
