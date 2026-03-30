import { Stack } from "expo-router";

export default function CartRootLayout() {
    return <Stack>
        <Stack.Screen
            name="index"
            options={{
                title: "Cart",
                headerShown: false
            }}
        />
    </Stack>
}