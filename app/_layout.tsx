import { authClient } from "@/lib/auth-client";
import { Stack } from "expo-router";

export default function RootLayout() {
  const { data: session } = authClient.useSession();
  return (
    <Stack>
      <Stack.Protected guard={!!!session}>
        <Stack.Screen
          name="(auth)/login-register"
          options={{ headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
