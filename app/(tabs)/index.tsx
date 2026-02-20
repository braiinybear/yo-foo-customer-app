import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// ── Home components ───────────────────────────────────────────────────────────
import CuisineFilter from "@/components/home/CuisineFilter";
import HeaderBar from "@/components/home/HeaderBar";
import HeroBanner from "@/components/home/HeroBanner";
import RestaurantCard, { Restaurant } from "@/components/home/RestaurantCard";
import SearchBar from "@/components/home/SearchBar";
import { router } from "expo-router";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useAddresses } from "@/hooks/useAddresses";

// ── Mock data ─────────────────────────────────────────────────────────────────
const RECOMMENDED: Restaurant[] = [
  {
    id: "r1",
    name: "Uttarakhand Food Junction",
    cuisine: "North Indian · Dal · Roti",
    rating: 4.2,
    deliveryTime: "20–25 mins",
    distance: "1 km",
    offer: "FLAT ₹100 OFF",
    priceForOne: 150,
    deliveryFee: "Free",
    emoji: "🍛",
    accentColor: "#fef3c7",
  },
  {
    id: "r2",
    name: "Nath's Chinese",
    cuisine: "Chinese · Momos · Noodles",
    rating: 4.1,
    deliveryTime: "25–30 mins",
    distance: "1.5 km",
    offer: "FLAT ₹120 OFF",
    priceForOne: 180,
    deliveryFee: "Free",
    emoji: "🥡",
    accentColor: "#fce7f3",
  },
  {
    id: "r3",
    name: "Lemon Chilli Farm",
    cuisine: "Continental · Salads · Wraps",
    rating: 4.0,
    deliveryTime: "30–35 mins",
    distance: "2 km",
    offer: "FLAT 50% OFF",
    priceForOne: 220,
    deliveryFee: "₹20",
    emoji: "🥗",
    accentColor: "#d1fae5",
  },
];

const FEATURED: Restaurant[] = [
  {
    id: "f1",
    name: "Dabba & Co.",
    cuisine: "Home Food · Thali",
    rating: 4.0,
    deliveryTime: "25–30 mins",
    distance: "900 m",
    offer: "Get items @ ₹99 only",
    priceForOne: 99,
    deliveryFee: "Free",
    emoji: "🥘",
    accentColor: "#ffe4e6",
  },
  {
    id: "f2",
    name: "Punjabi Foods",
    cuisine: "Punjabi · Butter Chicken",
    rating: 3.7,
    deliveryTime: "25–30 mins",
    distance: "1.2 km",
    offer: "FLAT ₹100 OFF",
    priceForOne: 200,
    deliveryFee: "₹30",
    emoji: "🍗",
    accentColor: "#fef9c3",
  },
  {
    id: "f3",
    name: "Punjabi Rasoi",
    cuisine: "Punjab · Dal Makhni",
    rating: 3.9,
    deliveryTime: "25–30 mins",
    distance: "1.8 km",
    offer: "FLAT ₹120 OFF",
    priceForOne: 170,
    deliveryFee: "Free",
    emoji: "🍲",
    accentColor: "#ede9fe",
  },
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Index() {
  const { data: session } = authClient.useSession();

  const { data: restaurants} = useRestaurants();
  console.log(restaurants);
  
  const { data:addresses} = useAddresses();
  console.log(addresses);
  

  const [search, setSearch] = useState("");
  const [vegMode, setVegMode] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState("all");

  // Derive user initials from session name
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";
  const userName = session?.user?.name ?? "User";

  return (
    <View style={styles.root}>
      <View style={styles.stickyTop}>
        <HeaderBar
          address={userName}
          subAddress="Tap to change delivery address"
          userInitial={userInitial}
          onAddressPress={() => { }}
          onWalletPress={() => { router.push("/wallet") }}
          onProfilePress={() => { router.push("/profile") }}
        />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          vegMode={vegMode}
          onVegToggle={setVegMode}
          placeholder="Search restaurants or dishes..."
          onSearchPress={() => { router.push("/search") }}
        />
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // cuisine filter sticks (index 1, comments don't count)
      >
        {/* 0 – Hero Banner */}
        <HeroBanner />


        {/* 1 – Cuisine filter (sticky) */}
        <CuisineFilter selected={selectedCuisine} onSelect={setSelectedCuisine} />

        {/* 5 – Featured / All restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionHeading}>
              {FEATURED.length + RECOMMENDED.length}+ Restaurants Delivering to You
            </Text>
          </View>
          <Text style={styles.featuredLabel}>Featured</Text>
          {FEATURED.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </View>


        <TouchableOpacity style={styles.singOutButton} onPress={() => authClient.signOut()}><Text>Sign Out</Text></TouchableOpacity>

      </ScrollView>


    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Sticky top header + search
  stickyTop: {
    backgroundColor: Colors.background,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },

  // Main scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Section wrapper
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: Colors.background,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionHeading: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  featuredLabel: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: 12,
    marginTop: -8,
  },
  singOutButton: {
    marginHorizontal: 10,
    padding: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});