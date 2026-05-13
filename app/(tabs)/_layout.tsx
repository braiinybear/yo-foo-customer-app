import { Ionicons } from "@expo/vector-icons";
import { useRouter, Tabs } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useCartStore } from "@/store/useCartStore";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const router = useRouter();
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const restaurantId = useCartStore((state) => state.restaurantId);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const { Colors, isDark } = useTheme();

  const BackButton = () => (
    <TouchableOpacity
      onPress={() => {
        if (restaurantId) {
          router.push(`/restaurants/${restaurantId}`);
        } else {
          router.back();
        }
      }}
      activeOpacity={0.7}
      style={{ paddingLeft: 8, paddingRight: 12, height: 44, justifyContent: 'center' }}
    >
      <Ionicons name="arrow-back" size={28} color={Colors.white} />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary, // Gold
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        tabBarStyle: {
          backgroundColor: isDark ? Colors.background : Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 58 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 12,
          shadowColor: isDark ? Colors.secondary : "#000",
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
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
        name="wallet"
        options={{
          title: "Wallet",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: isDark ? Colors.background : Colors.secondary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.primary + '20',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.primary, // Gold
          },
          headerTitleAlign: 'center',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: isDark ? Colors.background : Colors.secondary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.primary + '20', // Subtle Gold line
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.primary, // Gold
          },
          headerTitleAlign: 'center',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.primary, // Gold badge
            color: Colors.secondary, // Navy text
            fontSize: 10,
            top: -2,
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
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: isDark ? Colors.background : Colors.secondary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.primary + '20',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.primary, // Gold
          },
          headerTitleAlign: 'center',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
