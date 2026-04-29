import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import RestaurantCard from "@/components/home/RestaurantCard";
import SearchBar from "@/components/home/SearchBar";
import { router } from "expo-router";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useAddresses } from "@/hooks/useAddresses";
import AddressModal from "@/components/home/AddressModal";
import { UserAddress } from "@/types/user";
import { Restaurant } from "@/types/restaurants";
import RestaurantCardSkeleton from "@/components/loadingSkelton/RestaurantCardSkeleton";
import { useVegTypeStore } from "@/store/useVegTypeStore";

// The root page of the app
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
    isError: isRestaurantsError,
  } = useRestaurants();

  // Flatten pages → single array for FlatList
  const restaurants: Restaurant[] = useMemo(
    () => pagedData?.pages.flatMap((p) => p.data) ?? [],
    [pagedData],
  );

  const totalCount = pagedData?.pages[0]?.meta.total ?? 0;

  // ── Addresses ────────────────────────────────────────────────────────────
  const {
    data: addresses,
    refetch: refetchAddresses,
    isError: isAddressesError,
  } = useAddresses();

  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const { selectedVegType, setSelectedVegType } = useVegTypeStore();

  // Derive unique cuisine types from all fetched restaurants, always with "all" first
  const cuisines = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => r.cuisineTypes.forEach((c) => set.add(c)));
    return ["all", ...Array.from(set)];
  }, [restaurants]);

  // ── Filter restaurants by cuisine ────────────────────────────
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch =
        !search ||
        restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
        restaurant.cuisineTypes?.some((c) =>
          c.toLowerCase().includes(search.toLowerCase()),
        );

      const matchesCuisine =
        selectedCuisine === "all" ||
        restaurant.cuisineTypes?.includes(selectedCuisine);

      // Filter by veg type
      let matchesVegType = true;
      if (selectedVegType && restaurant.type) {
        if (selectedVegType === "veg") {
          matchesVegType = restaurant.type === "VEG";
        } else if (selectedVegType === "non-veg") {
          matchesVegType = restaurant.type === "NON_VEG";
        } else if (selectedVegType === "vegan") {
          matchesVegType = restaurant.type === "VEGAN";
        }
      }

      return matchesSearch && matchesCuisine && matchesVegType;
    });
  }, [restaurants, search, selectedCuisine, selectedVegType]);

  // ── Auto-select default address ───────────────────────────────────────────
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    }
  }, [addresses, selectedAddress]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchRestaurants(), refetchAddresses()]);
    } catch (e) {
      console.error("Refresh failed:", e);
      // Error states will be updated by the hooks
    } finally {
      setRefreshing(false);
    }
  }, [refetchRestaurants, refetchAddresses]);

  // ── Handle infinite scroll ──────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  // ── Header (rendered inside FlatList as ListHeaderComponent) ─────────────
  const ListHeader = (
    <View style={styles.sectionHeader}>
      {isRestaurantsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load restaurants. Please try again.
          </Text>
          <Text onPress={() => refetchRestaurants()} style={styles.retryLink}>
            Retry
          </Text>
        </View>
      )}
      {isLoading && !isRestaurantsError ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </View>
      ) : !isRestaurantsError ? (
        <Text style={styles.sectionHeading}>
          {`${filteredRestaurants.length} ${
            selectedVegType === "veg"
              ? "Vegetarian"
              : selectedVegType === "non-veg"
                ? "Non-Vegetarian"
                : selectedVegType === "vegan"
                  ? "Vegan"
                  : ""
          } Restaurants`}
        </Text>
      ) : null}
    </View>
  );

  // ── Footer spinner ───────────────────────────────────────────────────────

  const ListFooter = isFetchingNextPage ? (
    <ActivityIndicator
      size="small"
      color={Colors.primary}
      style={styles.footerSpinner}
    />
  ) : null;

  return (
    <View style={styles.root}>
      {/* Top bar: HeaderBar - sticky */}
      <View style={styles.stickyTop}>
        <HeaderBar
          address={selectedAddress ? [selectedAddress] : addresses}
          subAddress="Tap to change delivery address"
          userInitial={userInitial}
          userImage={session?.user?.image}
          onAddressPress={() => setIsAddressModalVisible(true)}
          onWalletPress={() => router.push("/wallet")}
          onProfilePress={() => router.push("/profile")}
        />
      </View>

      {/* Error banner for addresses */}
      {isAddressesError && (
        <View style={styles.addressErrorBanner}>
          <Text style={styles.addressErrorText}>
            ⚠ Could not load delivery addresses
          </Text>
          <Text
            onPress={() => refetchAddresses()}
            style={styles.retryLinkBanner}
          >
            Retry
          </Text>
        </View>
      )}

      {/* Sticky header: SearchBar, CuisineFilter */}
      <View style={styles.stickyHeader}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search restaurants or dishes..."
          onSearchPress={() => router.push("/search")}
        />
        <CuisineFilter
          cuisines={cuisines}
          selected={selectedCuisine}
          onSelect={setSelectedCuisine}
        />
      </View>

      {/* Scrollable restaurant list */}
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

  // Sticky top header
  stickyTop: {
    backgroundColor: "#004D4D",
    color: Colors.white,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },

  stickyHeader: {
    backgroundColor: Colors.background,
    gap: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 9,
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
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },

  loadingText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  footerSpinner: {
    marginVertical: 20,
  },

  // Error styles
  errorContainer: {
    backgroundColor: "#FEE8E8",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  errorText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: "#91271F",
    flex: 1,
    marginRight: 12,
  },

  retryLink: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  addressErrorBanner: {
    backgroundColor: "#FECACA",
    borderBottomWidth: 1,
    borderBottomColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 8,
  },

  addressErrorText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: "#7F1D1D",
    flex: 1,
  },

  retryLinkBanner: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: "#DC2626",
    paddingHorizontal: 8,
  },
});
