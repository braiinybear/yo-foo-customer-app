import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ── Home components ───────────────────────────────────────────────────────────
import CuisineFilter from "@/components/home/CuisineFilter";
import HeaderBar from "@/components/home/HeaderBar";
import HeroBanner from "@/components/home/HeroBanner";
import RestaurantCard from "@/components/home/RestaurantCard";
import SearchBar from "@/components/home/SearchBar";
import { router } from "expo-router";
import { useRestaurants, useRestaurantsBySearch } from "@/hooks/useRestaurants";
import { useAddresses } from "@/hooks/useAddresses";
import AddressModal from "@/components/home/AddressModal";
import { UserAddress } from "@/types/user";
import { Restaurant } from "@/types/restaurants";

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Index() {
  const { data: session } = authClient.useSession();

  // ── Infinite-scroll restaurants ──────────────────────────────────────────
  const {
    data: pagedData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchRestaurants,
  } = useRestaurants();

  // Flatten pages → single array for FlatList
  const restaurants: Restaurant[] = useMemo(
    () => pagedData?.pages.flatMap((p) => p.data) ?? [],
    [pagedData]
  );

  const totalCount = pagedData?.pages[0]?.meta.total ?? 0;

  // ── Addresses ────────────────────────────────────────────────────────────
  const { data: addresses, refetch: refetchAddresses } = useAddresses();

  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);

  const [search, setSearch] = useState("");
  const [vegMode, setVegMode] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Derive unique cuisine types from all fetched restaurants, always with "all" first
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => r.cuisineTypes.forEach((c) => set.add(c)));
    return ["all", ...Array.from(set)];
  }, [restaurants]);

  // ── Veg search (only when toggle is ON) ──────────────────────────────────
  const {
    data: vegPagedData,
    isLoading: vegLoading,
    hasNextPage: vegHasNextPage,
    isFetchingNextPage: vegIsFetchingNextPage,
    fetchNextPage: vegFetchNextPage,
    refetch: refetchVeg,
  } = useRestaurantsBySearch({
    type: vegMode ? "VEG" : undefined,
  });

  // Flatten veg pages → array
  const vegRestaurants: Restaurant[] = useMemo(
    () => vegPagedData?.pages.flatMap((p) => p.data) ?? [],
    [vegPagedData]
  );
  const vegTotalCount = vegPagedData?.pages[0]?.meta.total ?? 0;

  // What we actually render (before cuisine filter)
  const displayedRestaurants: Restaurant[] = vegMode ? vegRestaurants : restaurants;
  const listLoading = vegMode ? vegLoading : isLoading;

  // Client-side cuisine filter — "all" means no filter
  const filteredRestaurants = useMemo(() => {
    if (selectedCuisine === "all") return displayedRestaurants;
    return displayedRestaurants.filter((r) =>
      r.cuisineTypes.some(
        (c) => c.toLowerCase() === selectedCuisine.toLowerCase()
      )
    );
  }, [displayedRestaurants, selectedCuisine]);

  // ── Auto-select default address ───────────────────────────────────────────
  React.useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    }
  }, [addresses]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchRestaurants(),
        refetchAddresses(),
        vegMode ? refetchVeg() : Promise.resolve(),
      ]);
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRestaurants, refetchAddresses, refetchVeg, vegMode]);

  // ── Load next page (works in both normal and veg mode) ───────────────────
  const handleEndReached = useCallback(() => {
    if (vegMode) {
      if (vegHasNextPage && !vegIsFetchingNextPage) vegFetchNextPage();
    } else {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }
  }, [vegMode, vegHasNextPage, vegIsFetchingNextPage, vegFetchNextPage, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  // ── Full-page initial loader ──────────────────────────────────────────────
  if (listLoading && displayedRestaurants.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Header (rendered inside FlatList as ListHeaderComponent) ─────────────
  const ListHeader = (
    <>
      <HeroBanner />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeading}>
          {vegMode ? vegTotalCount : totalCount}+ Restaurants Delivering to You
        </Text>
        <Text style={styles.featuredLabel}>
          {vegMode ? "Veg Only" : "Featured"}
        </Text>
      </View>
    </>
  );

  // ── Footer spinner (both normal and veg modes) ───────────────────────────
  const isLoadingMore = vegMode ? vegIsFetchingNextPage : isFetchingNextPage;
  const ListFooter = isLoadingMore ? (
    <ActivityIndicator
      size="small"
      color={Colors.primary}
      style={styles.footerSpinner}
    />
  ) : null;

  return (
    <View style={styles.root}>
      {/* Sticky top bar: HeaderBar + SearchBar + CuisineFilter */}
      <View style={styles.stickyTop}>
        <HeaderBar
          address={selectedAddress ? [selectedAddress] : addresses}
          subAddress="Tap to change delivery address"
          userInitial={userInitial}
          onAddressPress={() => setIsAddressModalVisible(true)}
          onWalletPress={() => router.push("/wallet")}
          onProfilePress={() => router.push("/profile")}
        />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          vegMode={vegMode}
          onVegToggle={setVegMode}
          placeholder="Search restaurants or dishes..."
          onSearchPress={() => router.push("/search")}
        />
        <CuisineFilter cuisines={cuisines} selected={selectedCuisine} onSelect={setSelectedCuisine} />
      </View>

      {/* Infinite-scroll restaurant list */}
      <FlatList<Restaurant>
        data={filteredRestaurants}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() =>
              router.push({
                pathname: "/restaurants/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      <AddressModal
        visible={isAddressModalVisible}
        onClose={() => setIsAddressModalVisible(false)}
        addresses={addresses || []}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },

  // Sticky top header + search
  stickyTop: {
    backgroundColor: Colors.primary,
    color: Colors.white,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },

  scrollContent: {
    paddingBottom: 28,
  },

  // Section header inside FlatList
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: Colors.background,
  },
  sectionHeading: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  featuredLabel: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: 12,
  },

  footerSpinner: {
    marginVertical: 20,
  },
});