import { Colors } from "@/constants/colors";
import { Stack } from "expo-router";

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: "Search",
        headerBackTitle: "Back",
        headerBackButtonDisplayMode: "default",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTintColor: "#fff",
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTitleAlign: "center",
          headerTitleStyle: {
            color: "#fff",
          },
        }}
      />
    </Stack>
  );
}
