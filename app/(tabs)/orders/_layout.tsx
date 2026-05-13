import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";

export default function OrderLayout() {
    const { Colors, isDark } = useTheme();
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown:false}} />
            <Stack.Screen
                name="[id]"
                options={{headerShown:false, title: "Order Details", headerBackTitle: "Orders",headerTintColor: isDark ? Colors.white : Colors.text,}}
            />
        </Stack>
    );
}