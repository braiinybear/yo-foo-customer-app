import { Stack } from "expo-router";

export default function WalletRootLayout() {
    return <Stack>
        <Stack.Screen
            name="index"
            options={{
                title: "Wallet",
                headerShown: false
            }}
        />
    </Stack>
}