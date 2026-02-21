import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerShown:false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Profile",
          headerShown:false
        }}
      />

      <Stack.Screen
        name="address/index"
        options={{
          title: "Saved Addresses",
        
        }}
      />
    </Stack>
  );
}
