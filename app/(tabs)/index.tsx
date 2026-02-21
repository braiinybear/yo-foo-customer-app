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
import RestaurantCard from "@/components/home/RestaurantCard";
import SearchBar from "@/components/home/SearchBar";
import { router } from "expo-router";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useUser } from "@/hooks/useUser";


// ── Screen ────────────────────────────────────────────────────────────────────
export default function Index() {
  const { data: session } = authClient.useSession();
  const { data: restaurants, isLoading, error } = useRestaurants();
  const [search, setSearch] = useState("");
  const [vegMode, setVegMode] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState("all");

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

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
              {restaurants?.length}+ Restaurants Delivering to You
            </Text>
          </View>
          <Text style={styles.featuredLabel}>Featured</Text>
          {restaurants?.map((r) => (
            <RestaurantCard key={r.id} onPress={() => router.push({ pathname: "/restaurants/[id]", params: { id: r.id } })} restaurant={r} />
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