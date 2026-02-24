import SearchBar from "@/components/home/SearchBar";
import { View, TouchableOpacity, ScrollView, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRestaurantsBySearch } from "@/hooks/useRestaurants";
import RestaurantCard from "@/components/home/RestaurantCard";
import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";

export default function SearchScreen() {
  const [search, setSearch] = useState("");
  const [vegMode, setVegMode] = useState(false);
  const router = useRouter();

  const { data: restaurants, isPending, isError } = useRestaurantsBySearch({
    query: search,
    type: vegMode ? "VEG" : undefined,
  });

  return (
    <View style={styles.container}>
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

      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {search.length > 0 && (
          <Text style={styles.resultsCount}>
            {isPending ? "Searching..." : `${restaurants?.length || 0} results found`}
          </Text>
        )}

        {isPending && (search.length > 0 || vegMode) ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
          </View>
        ) : restaurants && restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={() => router.push({ pathname: "/restaurants/[id]", params: { id: restaurant.id } })}
            />
          ))
        ) : (search.length > 0 || vegMode) ? (
          <View style={styles.centerContainer}>
            <Text style={styles.noResultsText}>No restaurants found for "{search}"</Text>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="search-outline" size={64} color={Colors.border} />
            <Text style={styles.placeholderText}>Search for your favorite food or restaurant</Text>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  searchBarWrapper: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    marginTop: 100,
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
  },
  placeholderText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.md,
    color: Colors.muted,
    marginTop: 16,
    textAlign: "center",
  },
});

