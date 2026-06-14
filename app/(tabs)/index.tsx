import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
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
  withTiming,
  Easing,
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
import { useUser } from "@/hooks/useUser";
import { useUserLocation } from "@/hooks/useUserLocation";

// Stable FlatList helpers — defined outside component to prevent re-creation
const ITEM_HEIGHT = 306; // 200px image + ~90px info + 16px marginBottom
const keyExtractor = (r: Restaurant) => r.id;
const getItemLayout = (_: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Index() {
  const { Colors, isDark } = useTheme();
  const { data: session } = authClient.useSession();
  const { data: user } = useUser();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

  const { coords, isLoading: locationLoading, error: locationError } = useUserLocation();

  // ── Infinite-scroll restaurants ──────────────────────────────────────────
  const {
    data: pagedData,
    isLoading: restaurantsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchRestaurants,
    isError: isRestaurantsError,
  } = useRestaurants(coords?.lat, coords?.lng);

  const isLoading = locationLoading || (restaurantsLoading && coords !== null);

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
  
  // ── Header Animations (Reanimated — Swiggy/Zomato style) ─────────────────
  const FIXED_HEADER_HEIGHT = 100;
  const HIDEABLE_HEIGHT = 190; // SearchBar(~68) + CuisineFilter(~96) + padding(12) + safety margin
  
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const accumulatedDiff = useSharedValue(0);
  const isHeaderHidden = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;
      lastScrollY.value = currentY;
      scrollY.value = currentY;
      
      // Near the top of the list → always show header
      if (currentY <= 10) {
        if (isHeaderHidden.value) {
          headerTranslateY.value = withTiming(0, { duration: 200 });
          isHeaderHidden.value = false;
        }
        accumulatedDiff.value = 0;
        return;
      }

      // Accumulate scroll in the same direction; reset on direction change
      if ((diff > 0 && accumulatedDiff.value < 0) || (diff < 0 && accumulatedDiff.value > 0)) {
        accumulatedDiff.value = 0;
      }
      accumulatedDiff.value += diff;

      // Scrolled down 15px consecutively → hide
      if (accumulatedDiff.value > 15 && !isHeaderHidden.value) {
        headerTranslateY.value = withTiming(-HIDEABLE_HEIGHT, { 
          duration: 280,
          easing: Easing.out(Easing.cubic),
        });
        isHeaderHidden.value = true;
        accumulatedDiff.value = 0;
      }
      
      // Scrolled up 15px consecutively → show
      if (accumulatedDiff.value < -15 && isHeaderHidden.value) {
        headerTranslateY.value = withTiming(0, { 
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
        isHeaderHidden.value = false;
        accumulatedDiff.value = 0;
      }
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

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
          matchesVegType = restaurant.type === "VEG" || restaurant.type === "VEGAN";
        } else if (selectedVegType === "non-veg") {
          // If non-veg is selected, show everything (Veg, Vegan, and Non-Veg)
          matchesVegType = true;
        } else if (selectedVegType === "vegan") {
          matchesVegType = restaurant.type === "VEGAN" || restaurant.type === "VEG";
        }
      }

      return matchesSearch && matchesCuisine && matchesVegType;
    });
  }, [restaurants, search, selectedCuisine, selectedVegType]);

  // ── Auto-select default address ───────────────────────────────────────────
  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      // All addresses deleted → clear the stale selection
      setSelectedAddress(null);
      return;
    }

    if (!selectedAddress) {
      // No selection yet → pick default or first
      setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
      return;
    }

    // If the currently selected address was deleted, pick a new one
    const stillExists = addresses.some((a) => a.id === selectedAddress.id);
    if (!stillExists) {
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

  const userInitial = (user?.name || session?.user?.name)?.[0]?.toUpperCase() ?? "U";

  // ── STABLE renderItem (prevents RestaurantCard re-mount on every parent render) ──
  const renderRestaurantCard = useCallback(({ item, index }: { item: Restaurant; index: number }) => (
    <RestaurantCard
      restaurant={item}
      index={index}
      onPress={() =>
        router.push({
          pathname: "/restaurants/[id]",
          params: { id: item.id },
        })
      }
    />
  ), []);

  // ── Header (memoized to prevent FlatList re-layout on every state change) ──
  const ListHeader = useMemo(() => (
    <View>
      {/* Spacer for floating headers (Fixed(100) + Floating(190)) */}
      <View style={{ height: FIXED_HEADER_HEIGHT + 190 }} />

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
  ), [isRestaurantsError, isLoading, styles, refetchRestaurants]);

  // ── Empty State ────────────────────────────────────────────────────────
  const ListEmpty = useMemo(() => {
    if (isLoading || isRestaurantsError) return null;
    if (locationError) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconCircle}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>Location Access Required</Text>
          <Text style={styles.emptyStateSub}>
            {locationError} Please enable location permissions in your device settings to view nearby restaurants.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconCircle}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.emptyStateTitle}>We're not here yet!</Text>
        <Text style={styles.emptyStateSub}>
          Your area is currently out of our service range. We are expanding rapidly, so check back soon!
        </Text>
      </View>
    );
  }, [isLoading, isRestaurantsError, locationError, styles, Colors.primary]);

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
          userImage={user?.image || session?.user?.image}
          onAddressPress={() => setIsAddressModalVisible(true)}
          onWalletPress={() => router.push("/notification")}
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
        keyExtractor={keyExtractor}
        onScroll={scrollHandler}
        scrollEventThrottle={8}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
        removeClippedSubviews={true}
        initialNumToRender={4}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={30}
        windowSize={5}
        getItemLayout={getItemLayout}
        renderItem={renderRestaurantCard}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
            progressViewOffset={FIXED_HEADER_HEIGHT + HIDEABLE_HEIGHT + 20}
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
    overflow: 'hidden',
  },

  stickyHeader: {
    backgroundColor: isDark ? Colors.background : Colors.secondary,
    gap: 0,
    zIndex: 9,
    paddingTop: 12,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 120, // Keep plenty of spacing for the floating global cart banner
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

  emptyStateContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyStateIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateSub: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
