import { Ionicons } from "@expo/vector-icons";
import { useRouter,Tabs } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useCartStore } from "@/store/useCartStore";
import { Colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const router = useRouter();
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const restaurantId = useCartStore((state) => state.restaurantId);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

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
        // tabBarActiveTintColor is the color of the active tab icon and label, while tabBarInactiveTintColor is for inactive tabs
        tabBarActiveTintColor: Colors.white,
        // tabBarInactiveTintColor: "rgba(255,255,255,0.55)" makes the inactive icons and labels semi-transparent white, giving a nice contrast against the primary color background
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
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
        name="cart"
        options={{
          title: "Cart",
          headerShown: true,
          headerLeft: () => <BackButton />,
          headerStyle: {
            backgroundColor: Colors.primary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.text + '08',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.white,
          },
          headerTitleAlign: 'center',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.secondary,
            color: Colors.white,
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
            backgroundColor: Colors.primary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.text + '08',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: Colors.white,
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
