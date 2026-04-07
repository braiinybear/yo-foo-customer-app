import SplashScreenView from "@/components/SplashScreenView";
import { Colors } from "@/constants/colors";

// Better-auth authentication.
import { authClient } from "@/lib/auth-client";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

// This is the expo splash screen.
import * as ExpoSplashScreen from "expo-splash-screen";

// This is for setting the Android navigation bar button colors.
import * as NavigationBar from "expo-navigation-bar";

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { NotificationProvider } from "@/context/NotificationContext";
import * as Notifications from "expo-notifications";
import { User } from "@/types/user";
import { SocketProvider } from "@/context/SocketContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
  }),
});

// Keep the native splash visible while we load
ExpoSplashScreen.preventAutoHideAsync();

// Create a client outside the component to prevent re-instantiation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 15, // Unused data is garbage collected after 15 minutes
      retry: 2, // Retry failed requests twice before throwing an error
      refetchOnWindowFocus: false, // Turn off for less aggressive fetching
    },
  },
});

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const [splashDone, setSplashDone] = useState<boolean>(false);

  // Font loading
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_900Black,
  });

  // Combined readiness check
  const isAppReady = fontsLoaded;

  // Hide splash screen when app is ready
  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await ExpoSplashScreen.hideAsync();
    }
  }, [isAppReady]);

  // Make Android nav bar buttons dark so they're visible on light backgrounds
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync("dark");
    }
  }, []);

  // Show nothing until fonts are ready
  if (!isAppReady) return null;

  const isLoggedIn = !isPending && !!session;
  const isLoggedOut = !isPending && !session;

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <SocketProvider user={session?.user as User | undefined}>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            {/* Animated in-app splash on first load */}
            {!splashDone && (
              <SplashScreenView onFinish={() => setSplashDone(true)} />
            )}

            {/* Transition overlay during auth state transitions */}
            {splashDone && isPending && (
              <View style={transitionStyles.overlay}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}

            <Stack>
              {/* Only accessible when not logged in */}
              <Stack.Protected guard={isLoggedOut}>
                <Stack.Screen
                  name="(auth)/login"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="(auth)/register"
                  options={{ headerShown: false }}
                />
              </Stack.Protected>

              {/* Only accessible when logged in */}
              <Stack.Protected guard={isLoggedIn}>
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="profile"
                  options={{
                    headerShown: true,
                    headerTitle: "Profile",
                    headerTintColor: "#fff",
                    headerStyle: {
                      backgroundColor: Colors.primary,
                    },
                    headerTitleAlign: "center",
                    headerTitleStyle: {
                      color: "#fff",
                    },
                  }}
                />
                <Stack.Screen
                  name="wallet"
                  options={{
                    headerShown: true,
                    headerTitle: "Wallet",
                    headerTintColor: "#fff",
                    headerStyle: {
                      backgroundColor: Colors.primary,
                    },
                    headerTitleAlign: "center",
                    headerTitleStyle: {
                      color: "#fff",
                    },
                  }}
                />
                <Stack.Screen
                  name="search"
                  options={{
                    headerShown: false,
                    headerTitle: "Search",
                  }}
                />
                <Stack.Screen
                  name="restaurants"
                  options={{
                    headerShown: false,
                    headerTitle: "Restaurants",
                  }}
                />
                <Stack.Screen
                  name="checkout"
                  options={{
                    headerShown: true,
                    headerTintColor: "#fff",
                    headerStyle: {
                      backgroundColor: Colors.primary,
                    },
                    headerTitleStyle: {
                      color: "#fff",
                    },
                  }}
                />
                <Stack.Screen
                  name="animation"
                  options={{
                    headerShown: false,
                    headerTintColor: "#fff",
                    headerStyle: {
                      backgroundColor: Colors.primary,
                    },
                    headerTitleStyle: {
                      color: "#fff",
                    },
                  }}
                />
              </Stack.Protected>
            </Stack>
          </View>
        </SocketProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

const transitionStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
