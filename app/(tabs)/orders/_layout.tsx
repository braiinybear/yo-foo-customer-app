import { Colors } from "@/constants/colors";
import { Stack } from "expo-router";

export default function OrderLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown:false}} />
            <Stack.Screen
                name="[id]"
                options={{headerShown:false, title: "Order Details", headerBackTitle: "Orders",headerTintColor: '#fff',}}
            />
        </Stack>
    );
}