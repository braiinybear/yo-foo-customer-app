import { Stack } from "expo-router";

export default function SearchLayout() {
    return (
        <Stack screenOptions={{
            headerTitleAlign: "center",
            headerShown: false,
            headerTitle: "Search"
        }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
    );
}