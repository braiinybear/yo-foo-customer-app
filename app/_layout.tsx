import { Colors } from "@/constants/colors";
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

import * as ExpoSplashScreen from "expo-splash-screen";
import * as NavigationBar from "expo-navigation-bar";

import React, { useCallback, useEffect, useState } from "react";

import {
  AppState,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import GlobalCustomAlert from "@/components/GlobalCustomAlert";

import { NotificationProvider } from "@/context/NotificationContext";

import * as Notifications from "expo-notifications";

import { SocketProvider } from "@/context/SocketContext";

import LocationSetupScreen, {
  shouldShowLocationSetup,
} from "@/components/LocationSetupScreen";

import { User } from "@/types/user";
import SplashScreenView from "@/components/SplashScreenView";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
  }),
});

// Keep native splash visible
ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();

  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [wasLoggedIn, setWasLoggedIn] = useState(false);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_900Black,
  });

  // App ready only when fonts loaded
  const isAppReady = fontsLoaded;

  // Hide native splash screen
  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await ExpoSplashScreen.hideAsync();
    }
  }, [isAppReady]);

  // Android navigation buttons & AppState for resume handling
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync("dark");
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setIsResuming(true);
        // Delay to allow auth session to settle on resume
        setTimeout(() => setIsResuming(false), 2500);
      }
    });

    return () => subscription.remove();
  }, []);

  // Track if we've ever had a session in this lifecycle
  useEffect(() => {
    if (session) {
      setWasLoggedIn(true);
    } else if (!isPending && !isResuming) {
      // Only clear if we are sure it's a real logout
      setWasLoggedIn(false);
    }
  }, [session, isPending, isResuming]);

  // Location setup logic
  useEffect(() => {
    if (session) {
      shouldShowLocationSetup().then((needed) => {
        if (needed) {
          setShowLocationSetup(true);
        }
      });
    } else {
      setShowLocationSetup(false);
    }
  }, [session]);

  // Wait until fonts are loaded
  if (!isAppReady) {
    return null;
  }

  // BLOCK UI while auth session restores, splash animation is running, or app is resuming/re-validating
  // We stay on splash if we WERE logged in but don't have a session yet
  if (isPending || !splashFinished || (wasLoggedIn && !session) || (isResuming && !session)) {
    return (
      <SplashScreenView onFinish={() => setSplashFinished(true)} />
    );
  }

  const isLoggedIn = !isPending && (!!session || (isResuming && wasLoggedIn));
  const isLoggedOut = !isPending && !session && !isResuming && !wasLoggedIn;

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <SocketProvider user={session?.user as User | undefined}>
          <View
            style={{ flex: 1 }}
            onLayout={onLayoutRootView}
          >
            <Stack>
              {/* AUTH ROUTES */}
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

              {/* APP ROUTES */}
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
                  }}
                />

                <Stack.Screen
                  name="restaurants"
                  options={{
                    headerShown: false,
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
              </Stack.Protected>
            </Stack>
          </View>

          {/* LOCATION SETUP */}
          {showLocationSetup && (
            <View style={StyleSheet.absoluteFill}>
              <LocationSetupScreen
                onDone={() => setShowLocationSetup(false)}
              />
            </View>
          )}


        </SocketProvider>
      </NotificationProvider>

      <GlobalCustomAlert />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});