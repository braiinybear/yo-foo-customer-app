import SearchBar from "@/components/home/SearchBar";
import RestaurantCard from "@/components/home/RestaurantCard";
import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useRestaurantsBySearch } from "@/hooks/useRestaurants";
import { Restaurant } from "@/types/restaurants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SearchScreen() {
  const [search, setSearch] = useState("");
  const [vegMode, setVegMode] = useState(false);
  const router = useRouter();

  const {
    data: pagedData,
    isFetching,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useRestaurantsBySearch({
    query: search,
    type: vegMode ? "VEG" : undefined,
  });

  // Flatten infinite pages → single Restaurant array
  const restaurants: Restaurant[] = useMemo(
    () => pagedData?.pages.flatMap((p) => p.data) ?? [],
    [pagedData]
  );

  const totalCount = pagedData?.pages[0]?.meta.total ?? 0;
  const isFirstLoad = isFetching && restaurants.length === 0;
  const hasQuery = search.length > 0 || vegMode;

  // Load next page when 40% from bottom
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Render states ──────────────────────────────────────────────────────────
  const renderEmpty = () => {
    if (isFirstLoad) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
        </View>
      );
    }
    if (hasQuery && restaurants.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={Colors.border} />
          <Text style={styles.noResultsText}>No restaurants found for "{search}"</Text>
        </View>
      );
    }
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="search-outline" size={64} color={Colors.border} />
        <Text style={styles.placeholderText}>
          Search for your favorite food or restaurant
        </Text>
      </View>
    );
  };

  const ListHeader = hasQuery ? (
    <Text style={styles.resultsCount}>
      {isFirstLoad ? "Searching..." : `${totalCount} result${totalCount !== 1 ? "s" : ""} found`}
    </Text>
  ) : null;

  const ListFooter = isFetchingNextPage ? (
    <ActivityIndicator
      size="small"
      color={Colors.primary}
      style={styles.footerSpinner}
    />
  ) : null;

  return (
    <View style={styles.container}>
      {/* Search bar header */}
      <View style={styles.header}>
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            vegMode={vegMode}
            onVegToggle={setVegMode}
            placeholder="Search restaurants or dishes..."
          />
        </View>
      </View>

      {/* Infinite-scroll results */}
      <FlatList<Restaurant>
        data={restaurants}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() =>
              router.push({ pathname: "/restaurants/[id]", params: { id: item.id } })
            }
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.scrollContent,
          restaurants.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    paddingHorizontal: 0,
    backgroundColor: Colors.white,
    borderBottomColor: Colors.border,
  },
  searchBarWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContent: {
    flexGrow: 1,
  },
  resultsCount: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  errorText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.md,
    color: Colors.danger,
  },
  noResultsText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  placeholderText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.md,
    color: Colors.muted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  footerSpinner: {
    marginVertical: 20,
  },
});
