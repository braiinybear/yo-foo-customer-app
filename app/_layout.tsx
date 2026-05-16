
import { authClient } from "@/lib/auth-client";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
import { AnimatedToast } from "@/components/AnimatedToast";

import { NotificationProvider } from "@/context/NotificationContext";
import * as Notifications from "expo-notifications";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { StatusBar } from "expo-status-bar";

import LocationSetupScreen, {
  shouldShowLocationSetup,
} from "@/components/LocationSetupScreen";

import SplashScreenView from "@/components/SplashScreenView";
import { useUser } from "@/hooks/useUser";

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedRoot() {
  const { Colors, isDark } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const { isLoading: isUserLoading } = useUser({ enabled: !!session });
  const segments = useSegments();
  const router = useRouter();

  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

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
        setTimeout(() => setIsResuming(false), 3500);
      }
    });

    return () => subscription.remove();
  }, [isDark, Colors.background]);


  const inAuthGroup = segments[0] === "(auth)";

  // Auth Guard: Redirect based on session state
  useEffect(() => {
    if (isPending || !splashFinished || isResuming) return;

    if (!session && !inAuthGroup) {
      // Not logged in -> go to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Logged in but on auth page -> go home
      router.replace("/");
    }
  }, [session, isPending, segments, splashFinished, isResuming, inAuthGroup]);

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
  // We stay on splash if:
  // 1. Session is still being fetched (isPending)
  // 2. Splash animation is still running (!splashFinished)
  // 3. We have no session and are not in auth group yet (waiting for redirect)
  // 4. App is resuming and session is not yet re-validated
  // 5. We have a session but it's currently being verified with the server (isUserLoading)
  if (isPending || !splashFinished || (!session && !inAuthGroup) || (isResuming && !session) || (session && isUserLoading)) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SplashScreenView onFinish={() => setSplashFinished(true)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
            <AnimatedToast />
          </NotificationProvider>
        </SocketProvider>
      )}
    </GestureHandlerRootView>
  );
}