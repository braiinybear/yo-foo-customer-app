import { Stack } from "expo-router";

export default function MenuRootLayout() {
    return <Stack
        screenOptions={{
            headerTitleAlign: "center",
        }}
    >
        <Stack.Screen
            name="index"
            options={{
                title: "Menu",
            }}
        />
    </Stack>
}