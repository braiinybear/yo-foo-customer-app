
import { authClient } from "@/lib/auth-client";

import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";

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
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { StatusBar } from "expo-status-bar";

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
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const { Colors, isDark } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

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
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
      NavigationBar.setBackgroundColorAsync(Colors.background);
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setIsResuming(true);
        // Delay to allow auth session to settle on resume
        setTimeout(() => setIsResuming(false), 3000);
      }
    });

    return () => subscription.remove();
  }, [isDark, Colors.background]);

  // Track if we've ever had a session in this lifecycle
  useEffect(() => {
    if (session) {
      setWasLoggedIn(true);
    } else if (!isPending && !isResuming) {
      // Only clear if we are sure it's a real logout
      setWasLoggedIn(false);
    }
  }, [session, isPending, isResuming]);

  // Auth Guard: Redirect based on session state
  useEffect(() => {
    if (isPending || !splashFinished || isResuming) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      // Not logged in -> go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Logged in but on auth page -> go home
      router.replace("/");
    }
  }, [session, isPending, segments, splashFinished, isResuming]);

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
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SplashScreenView onFinish={() => setSplashFinished(true)} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {showLocationSetup ? (
          <LocationSetupScreen onDone={() => setShowLocationSetup(false)} />
        ) : (
          <SocketProvider user={session?.user}>
            <NotificationProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
                <Stack.Screen
                  name="profile"
                  options={{
                    headerShown: true,
                    headerTitle: "Profile",
                    headerTintColor: Colors.white,
                    headerStyle: {
                      backgroundColor: isDark ? Colors.background : Colors.secondary,
                    },
                    headerTitleAlign: "center",
                    headerTitleStyle: {
                      color: Colors.primary,
                    },
                  }}
                />



                <Stack.Screen
                  name="checkout"
                  options={{
                    headerShown: true,
                    headerTitle: "Checkout",
                    headerTintColor: Colors.white,
                    headerStyle: {
                      backgroundColor: isDark ? Colors.background : Colors.secondary,
                    },
                    headerTitleAlign: "center",
                    headerTitleStyle: {
                      color: Colors.primary,
                    },
                  }}
                />
              </Stack>
              <GlobalCustomAlert />
            </NotificationProvider>
          </SocketProvider>
        )}
      </View>
    </QueryClientProvider>
  );
}