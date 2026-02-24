import { Stack } from "expo-router";

export default function SearchLayout() {
    return (
        <Stack screenOptions={{
            headerShown: false,
            headerTitle: "Search",
            headerBackTitle: "Back",
            headerBackButtonDisplayMode: "default",
        }}>
            <Stack.Screen name="index" options={{ headerShown: true }} />
        </Stack>
    );
}