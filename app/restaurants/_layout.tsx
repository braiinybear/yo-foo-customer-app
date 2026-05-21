import { Stack } from "expo-router";

export default function RestaurantRootLayout() {
    return <Stack
        screenOptions={{
            headerTitleAlign: "center",
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
            freezeOnBlur: true,
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