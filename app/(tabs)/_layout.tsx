import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCartStore } from "@/store/useCartStore";

export default function TabsLayout() {
    const cartCount = useCartStore((state) =>
        state.items.reduce((total, item) => total + item.quantity, 0)
    );

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#FF6B35",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#F3F4F6",
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: "Menu",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="restaurant-outline" color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="cart"
                options={{
                    title: "Cart",
                    tabBarBadge: cartCount > 0 ? cartCount : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: "#E23744",
                        color: "#FFFFFF",
                        fontSize: 10,
                    },
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cart-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: "Orders",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt-outline" color={color} size={size} />
                    ),
                }}
            />


        </Tabs>
    );
}