import { Stack } from "expo-router";

export default function OrderLayout() {
    return (
        <Stack screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="index" options={{ title: "My Orders" }} />
            <Stack.Screen
                name="[id]"
                options={{ title: "Order Details", headerBackTitle: "Orders" }}
            />
        </Stack>
    );
}