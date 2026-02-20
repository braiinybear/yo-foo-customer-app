import { Stack } from "expo-router";

export default function WalletRootLayout() {
    return <Stack
        screenOptions={{
            headerTitleAlign: "center",
            headerShown: false
        }}
    >
        <Stack.Screen
            name="index"
            options={{
                title: "My wallet",
            }}
        />
    </Stack>
}