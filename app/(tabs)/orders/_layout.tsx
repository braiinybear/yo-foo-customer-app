import { Colors } from "@/constants/colors";
import { Stack } from "expo-router";

export default function OrderLayout() {
    return (
        <Stack screenOptions={{ 
                headerTitleAlign: "center",
                headerTitleStyle: { color: Colors.white },
                headerStyle: { backgroundColor: Colors.primary }, // <--- Set the background color here
               // Optional: removes the bottom border line if you want a totally flat look
            }}>
            <Stack.Screen name="index" options={{ title: "My Orders"}} />
            <Stack.Screen
                name="[id]"
                options={{ title: "Order Details", headerBackTitle: "Orders" }}
            />
        </Stack>
    );
}