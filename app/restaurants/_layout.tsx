import { Stack } from "expo-router";

export default function RestaurantRootLayout() {
    return <Stack
        screenOptions={{
            headerTitleAlign: "center",
            headerShown: false
        }}
    >
        <Stack.Screen
            name="index"
            options={{
                title: "Restaurants",
            }}
        />
    </Stack>
}