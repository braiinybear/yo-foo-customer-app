import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  withTiming,
  Extrapolation,
  useDerivedValue,
  Easing
} from 'react-native-reanimated';

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
import CuisineFilterSkeleton from "@/components/loadingSkelton/CuisineFilterSkeleton";
import { useVegTypeStore } from "@/store/useVegTypeStore";

// The root page of the app
// ── Screen ────────────────────────────────────────────────────────────────────
export default function Index() {
  const { Colors, isDark } = useTheme();
  const { data: session } = authClient.useSession();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

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
  
  // ── Header Animations (Reanimated) ──────────────────────────────────────
  const FIXED_HEADER_HEIGHT = 100;
  const HIDEABLE_HEIGHT = 180;
  
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;
      
      // Update translation based on scroll diff, clamped to HIDEABLE_HEIGHT
      const newTranslateY = headerTranslateY.value - diff;
      headerTranslateY.value = Math.min(0, Math.max(-HIDEABLE_HEIGHT, newTranslateY));
      
      lastScrollY.value = currentY;
      scrollY.value = currentY;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const config = {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Custom smooth curve
    };

    return {
      transform: [{ translateY: withTiming(headerTranslateY.value, config) }],
      opacity: withTiming(
        interpolate(
          headerTranslateY.value,
          [-HIDEABLE_HEIGHT, -HIDEABLE_HEIGHT * 0.4, 0],
          [0, 1, 1],
          Extrapolation.CLAMP
        ),
        config
      ),
    };
  });

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
    <View>
      {/* Spacer for floating headers (Fixed(100) + Hideable(180)) */}
      <View style={{ height: FIXED_HEADER_HEIGHT + HIDEABLE_HEIGHT - 20 }} />

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
      </View>
      
      {isLoading && !isRestaurantsError && (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </View>
      )}
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

      {/* FIXED Top bar: HeaderBar */}
      <View style={[styles.stickyTop, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 110, height: FIXED_HEADER_HEIGHT }]}>
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

      {/* Floating Collapsible Container for Search & Cuisine */}
      <Animated.View style={[
        styles.floatingHeader,
        animatedHeaderStyle,
        { 
          top: FIXED_HEADER_HEIGHT, 
          zIndex: 100,
        }
      ]}>
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

        {/* Header: SearchBar, CuisineFilter */}
        <View style={styles.stickyHeader}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants or dishes..."
            onSearchPress={() => router.push("/search")}
          />
          {isLoading ? (
            <CuisineFilterSkeleton />
          ) : (
            <CuisineFilter
              cuisines={cuisines}
              selected={selectedCuisine}
              onSelect={setSelectedCuisine}
            />
          )}
        </View>
      </Animated.View>

      {/* Scrollable restaurant list */}
      <Animated.FlatList<Restaurant>
        data={filteredRestaurants}
        keyExtractor={(r) => r.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
            progressViewOffset={FIXED_HEADER_HEIGHT + 60}
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
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Sticky top header
  stickyTop: {
    backgroundColor: isDark ? Colors.background : Colors.secondary,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: isDark ? Colors.background : Colors.secondary,
  },

  stickyHeader: {
    backgroundColor: isDark ? Colors.background : Colors.secondary,
    gap: 0,
    zIndex: 9,
    paddingTop: 12,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },

  // Section header inside FlatList
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 40,
    backgroundColor: Colors.background,
  },
  sectionHeading: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 12,
    textTransform: "lowercase",
    letterSpacing: 0.3,
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
    color: Colors.textSecondary,
  },

  footerSpinner: {
    marginVertical: 24,
  },

  // Error styles
  errorContainer: {
    backgroundColor: Colors.danger + "15",
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  errorText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.danger,
    flex: 1,
    marginRight: 12,
  },

  retryLink: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(231,76,60,0.1)",
  },

  addressErrorBanner: {
    backgroundColor: Colors.danger + "15",
    borderBottomWidth: 1,
    borderBottomColor: Colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 8,
  },

  addressErrorText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.danger,
    flex: 1,
    marginRight: 12,
  },

  retryLinkBanner: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.danger,
    paddingHorizontal: 10,
  },
});
