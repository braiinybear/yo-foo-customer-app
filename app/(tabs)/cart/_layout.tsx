import { Stack } from "expo-router";

export default function CartRootLayout() {
    return <Stack
        screenOptions={{
            headerTitleAlign: "center",
        }}
    >
        <Stack.Screen
            name="index"
            options={{
                title: "Cart",
            }}
        />
    </Stack>
}