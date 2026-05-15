import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderImage } from "@/constants/images";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { 
  useCuisines, 
  useRecentSearches, 
  useAddRecentSearch, 
  useClearRecentSearches,
  useMenuItemsDiscovery
} from "@/hooks/useDiscovery";
import { useSearchRestaurants } from "@/hooks/useRestaurantSearch";
import { router } from "expo-router";
const VEG_TYPE_OPTIONS = [
  { id: "VEG", label: "Vegetarian", emoji: "🥦", color: "#10B981" },
  { id: "NON_VEG", label: "Non-Vegetarian", emoji: "🍗", color: "#EF4444" },
  { id: "VEGAN", label: "Vegan", emoji: "🌱", color: "#059669" },
];

export default function SearchPage() {
  const { Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const {selectedVegType, setSelectedVegType: storeSetSelectedVegType} = useVegTypeStore();
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [prepTimeRange, setPrepTimeRange] = useState<[number, number] | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"price" | "prepTime" | "rating" | null>(
    null,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showBestsellersOnly, setShowBestsellersOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to convert API format to store format
  const apiTypeToStoreType = (apiType: string): "veg" | "non-veg" | "vegan" | null => {
    if (apiType === "VEG") return "veg";
    if (apiType === "NON_VEG") return "non-veg";
    if (apiType === "VEGAN") return "vegan";
    return null;
  };

  // Map store vegType ("veg" | "non-veg" | "vegan") to API type ("VEG" | "NON_VEG" | "VEGAN")
  const vegTypeForAPI = useMemo(() => {
    if (!selectedVegType) return null;
    if (selectedVegType === "veg") return "VEG";
    if (selectedVegType === "non-veg") return "NON_VEG";
    if (selectedVegType === "vegan") return "VEGAN";
    return null;
  }, [selectedVegType]);

  // Debounce search query - only update after user stops typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Fetch search results
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch: refetchSearch } =
    useSearchRestaurants({
      query: debouncedSearchQuery,
      type: vegTypeForAPI as any,
      minRating: minRating ?? undefined,
      page: 1,
      limit: 5,
    });

  // Discovery Hooks
  const { data: cuisines } = useCuisines();
  const { data: recentSearches } = useRecentSearches();
  const { data: popularItems } = useMenuItemsDiscovery();
  const { mutate: addRecentSearch } = useAddRecentSearch();
  const { mutate: clearRecentSearches } = useClearRecentSearches();

  // Get all unique dishes (for horizontal scroll)
  const allDishes = useMemo(() => {
    let dishes = data?.pages.flatMap((page) => page.results) ?? [];

    // Apply filters to dishes
    dishes = dishes.filter((dish) => {
      if (showAvailableOnly && !dish.dishDetails.isAvailable) {
        return false;
      }
      if (priceRange) {
        const price = dish.dishDetails.avgPrice;
        if (price < priceRange[0] || price > priceRange[1]) {
          return false;
        }
      }
      if (prepTimeRange) {
        const prepTime = dish.dishDetails.prepTime || 0;
        if (prepTime < prepTimeRange[0] || prepTime > prepTimeRange[1]) {
          return false;
        }
      }
      return true;
    });

    return dishes;
  }, [data, showAvailableOnly, priceRange, prepTimeRange]);

  // Get restaurants for selected dish
  const restaurantResults = useMemo(() => {
    if (!selectedDishId) return [];

    const selectedDish = allDishes.find((d) => d.dishId === selectedDishId);
    if (!selectedDish) return [];

    let restaurants = selectedDish.restaurants.map((r) => ({
      ...r,
      dishDetails: selectedDish.dishDetails,
      dishName: selectedDish.dishName,
      dishId: selectedDish.dishId,
      categoryName: selectedDish.categoryName,
    }));

    // Apply restaurant filters
    restaurants = restaurants.filter((r) => {
      if (showBestsellersOnly && !r.isBestseller) {
        return false;
      }
      if (minRating && r.rating < minRating) {
        return false;
      }
      return true;
    });

    // Apply sorting
    if (sortBy) {
      restaurants.sort((a, b) => {
        let aValue: number = 0;
        let bValue: number = 0;

        if (sortBy === "price") {
          aValue = a.price;
          bValue = b.price;
        } else if (sortBy === "prepTime") {
          aValue = a.dishDetails.prepTime || 0;
          bValue = b.dishDetails.prepTime || 0;
        } else if (sortBy === "rating") {
          aValue = a.rating || 0;
          bValue = b.rating || 0;
        }

        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    return restaurants;
  }, [
    selectedDishId,
    allDishes,
    showBestsellersOnly,
    minRating,
    sortBy,
    sortOrder,
  ]);

  // Reset selected dish when search query changes
  useEffect(() => {
    setSelectedDishId(null);
  }, [debouncedSearchQuery]);

  // Auto-select first dish when dishes load
  useEffect(() => {
    if (allDishes.length > 0) {
      setSelectedDishId(allDishes[0].dishId);
    }
  }, [allDishes]);

  const totalUniqueDishes = data?.pages[0]?.totalUniqueDishes ?? 0;

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const onSearchSubmit = () => {
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
    }
  };

  const renderDishItem = (dish: any) => (
    <TouchableOpacity
      key={dish.dishId}
      style={[
        styles.dishItem,
        selectedDishId === dish.dishId && styles.dishItemSelected,
      ]}
      onPress={() => setSelectedDishId(dish.dishId)}
    >
      <Image
        source={{
          uri: dish.dishDetails.image || getPlaceholderImage(dish.dishId),
        }}
        style={[
          styles.dishItemImage,
          selectedDishId === dish.dishId && {
            borderColor: Colors.primary,
            borderWidth: 4,
          },
        ]}
      />
      <Text style={styles.dishItemName} numberOfLines={2}>
        {dish.dishName}
      </Text>
    </TouchableOpacity>
  );

  const renderRestaurantCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.restaurantCardItem}
        onPress={() =>
          router.push({
            pathname: "/restaurants/[id]",
            params: {
              id: item.restaurantId,
              menuItemName: item.dishName,
              menuItemId: item.dishId,
            },
          })
        }
      >
        {/* Dish and Restaurant Header */}
        <View style={styles.cardHeaderSection}>
          <Image
            source={{
              uri: item.dishDetails.image || getPlaceholderImage(item.dishId),
            }}
            style={styles.dishImageCard}
          />
          <View style={styles.dishCardInfo}>
            <Text style={styles.cardDishName} numberOfLines={2}>
              {item.dishName}
            </Text>
            <Text style={styles.cardCategory}>{item.categoryName}</Text>
            <View style={styles.cardTags}>
              <View style={styles.priceTag}>
                <Text style={styles.priceTagText}>₹{item.price}</Text>
              </View>
              {item.isBestseller && (
                <View style={styles.bestsellerTag}>
                  <Text style={styles.bestsellerTagText}>⭐ Bestseller</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Restaurant Info Section */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantNameRow}>
            <Text style={styles.restName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={Colors.white} />
              <Text style={styles.ratingBadgeText}>{item.rating}</Text>
            </View>
          </View>
          <Text style={styles.restAddress} numberOfLines={2}>
            📍 {item.costForTwo ? `₹${item.costForTwo} for two` : "Address"} •{" "}
            {item.estimatedDelivery}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View style={styles.root}>
      {/* Search Header */}
      <View style={[styles.searchHeader, { paddingTop: insets.top + 6 }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.secondary} />
        </TouchableOpacity>
        
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={Colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes or restaurants..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Results or Empty State */}
      {!searchQuery ? (
        <ScrollView style={styles.discoveryContainer} showsVerticalScrollIndicator={false}>
          {/* Recent Searches Section */}
          {recentSearches && recentSearches.length > 0 && (
            <View style={styles.discoverySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>YOUR RECENT SEARCHES</Text>
                <TouchableOpacity onPress={() => clearRecentSearches()}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.recentSearchesList}
              >
                {recentSearches.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.recentSearchChip}
                    onPress={() => setSearchQuery(item.query)}
                  >
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.recentSearchText}>{item.query}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* What's on your mind Section */}
          <View style={styles.discoverySection}>
            <Text style={styles.sectionTitle}>WHAT'S ON YOUR MIND?</Text>
            <View style={styles.cuisinesGrid}>
              {cuisines?.map((cuisine) => (
                <TouchableOpacity 
                  key={cuisine.id} 
                  style={styles.cuisineItem}
                  onPress={() => {
                    setSearchQuery(cuisine.name);
                    addRecentSearch(cuisine.name);
                  }}
                >
                  <View style={styles.cuisineImageWrapper}>
                    <Image source={{ uri: cuisine.image || getPlaceholderImage(cuisine.id) }} style={styles.cuisineImage} />
                  </View>
                  <Text style={styles.cuisineName} numberOfLines={1}>{cuisine.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Popular Dishes Section */}
          {popularItems && popularItems.length > 0 && (
            <View style={[styles.discoverySection, { paddingBottom: 40 }]}>
              <Text style={styles.sectionTitle}>POPULAR DISHES</Text>
              <View style={styles.popularItemsGrid}>
                {popularItems.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.popularItemCard}
                    onPress={() => {
                      router.push({
                        pathname: "/restaurants/[id]",
                        params: { 
                          id: item.restaurantId,
                          menuItemName: item.name,
                          menuItemId: item.id
                        }
                      });
                      addRecentSearch(item.name);
                    }}
                  >
                    <Image source={{ uri: item.image || getPlaceholderImage(item.id) }} style={styles.popularItemImage} />
                    <View style={styles.popularItemInfo}>
                      <Text style={styles.popularItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.popularItemPrice}>₹{item.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : isLoading && allDishes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : allDishes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for something else
          </Text>
        </View>
      ) : (
        <>
          {/* Horizontal Scrollable Dishes */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dishesScrollContainer}
            contentContainerStyle={styles.dishesContent}
          >
            {allDishes.map((dish) => renderDishItem(dish))}
          </ScrollView>

          {/* Restaurant Cards or Select Dish Prompt */}
          {!selectedDishId ? (
            <View style={styles.selectDishPrompt}>
              <Ionicons name="chevron-forward" size={48} color={Colors.muted} />
              <Text style={styles.selectDishText}>
                Select a dish to see restaurants
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {restaurantResults.length}{" "}
                  {selectedVegType === "veg"
                    ? "Vegetarian"
                    : selectedVegType === "non-veg"
                      ? "Non-Vegetarian"
                      : selectedVegType === "vegan"
                        ? "Vegan"
                        : ""}{" "}
                  restaurants
                </Text>
                {(selectedVegType ||
                  minRating ||
                  sortBy ||
                  showBestsellersOnly ||
                  !showAvailableOnly ||
                  priceRange ||
                  prepTimeRange) && (
                  <TouchableOpacity
                    onPress={() => {
                      storeSetSelectedVegType(null);
                      setMinRating(null);
                      setSortBy(null);
                      setShowBestsellersOnly(false);
                      setShowAvailableOnly(true);
                      setPriceRange(null);
                      setPrepTimeRange(null);
                    }}
                  >
                    <Text style={styles.clearFilters}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={restaurantResults}
                keyExtractor={(item) => item.menuItemId}
                renderItem={renderRestaurantCard}
                contentContainerStyle={styles.listContent}
                scrollEventThrottle={16}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No restaurants found</Text>
                    <Text style={styles.emptySubtitle}>
                      Try adjusting your filters
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {/* Veg Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Food Type</Text>
                <View style={styles.filterOptions}>
                  {VEG_TYPE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.filterOption,
                        selectedVegType === apiTypeToStoreType(option.id) && {
                          backgroundColor: option.color,
                          borderColor: option.color,
                        },
                      ]}
                      onPress={() => storeSetSelectedVegType(apiTypeToStoreType(option.id) as any)}
                    >
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      <Text
                        style={[
                          styles.optionLabel,
                          selectedVegType === apiTypeToStoreType(option.id) && {
                            color: Colors.white,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selectedVegType === apiTypeToStoreType(option.id) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={Colors.white}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rating Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                <View style={styles.ratingOptions}>
                  {[3.5, 4.0, 4.5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingOption,
                        minRating === rating && {
                          backgroundColor: Colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setMinRating(minRating === rating ? null : rating)
                      }
                    >
                      <Ionicons
                        name="star"
                        size={16}
                        color={
                          minRating === rating ? Colors.white : Colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.ratingLabel,
                          minRating === rating && { color: Colors.white },
                        ]}
                      >
                        {rating}+
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.filterOptions}>
                  {[
                    { id: "under100", label: "Under ₹100", range: [0, 100] },
                    { id: "100-200", label: "₹100 - ₹200", range: [100, 200] },
                    { id: "200-500", label: "₹200 - ₹500", range: [200, 500] },
                    {
                      id: "above500",
                      label: "Above ₹500",
                      range: [500, 10000],
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.filterOption,
                        priceRange?.[0] === option.range[0] &&
                          priceRange?.[1] === option.range[1] && {
                            backgroundColor: Colors.primary,
                            borderColor: Colors.primary,
                          },
                      ]}
                      onPress={() => {
                        if (
                          priceRange?.[0] === option.range[0] &&
                          priceRange?.[1] === option.range[1]
                        ) {
                          setPriceRange(null);
                        } else {
                          setPriceRange(option.range as [number, number]);
                        }
                      }}
                    >
                      <Text style={styles.optionEmoji}>💰</Text>
                      <Text
                        style={[
                          styles.optionLabel,
                          priceRange?.[0] === option.range[0] &&
                            priceRange?.[1] === option.range[1] && {
                              color: Colors.white,
                            },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {priceRange?.[0] === option.range[0] &&
                        priceRange?.[1] === option.range[1] && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={Colors.white}
                          />
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Prep Time Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Preparation Time</Text>
                <View style={styles.filterOptions}>
                  {[
                    { id: "under15", label: "Under 15 mins", range: [0, 15] },
                    { id: "15-30", label: "15 - 30 mins", range: [15, 30] },
                    { id: "30-45", label: "30 - 45 mins", range: [30, 45] },
                    { id: "above45", label: "Above 45 mins", range: [45, 120] },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.filterOption,
                        prepTimeRange?.[0] === option.range[0] &&
                          prepTimeRange?.[1] === option.range[1] && {
                            backgroundColor: Colors.primary,
                            borderColor: Colors.primary,
                          },
                      ]}
                      onPress={() => {
                        if (
                          prepTimeRange?.[0] === option.range[0] &&
                          prepTimeRange?.[1] === option.range[1]
                        ) {
                          setPrepTimeRange(null);
                        } else {
                          setPrepTimeRange(option.range as [number, number]);
                        }
                      }}
                    >
                      <Text style={styles.optionEmoji}>⏱️</Text>
                      <Text
                        style={[
                          styles.optionLabel,
                          prepTimeRange?.[0] === option.range[0] &&
                            prepTimeRange?.[1] === option.range[1] && {
                              color: Colors.white,
                            },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {prepTimeRange?.[0] === option.range[0] &&
                        prepTimeRange?.[1] === option.range[1] && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={Colors.white}
                          />
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Availability & Bestseller */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>More Options</Text>
                <TouchableOpacity
                  style={[
                    styles.checkboxOption,
                    showAvailableOnly && {
                      backgroundColor: `${Colors.primary}15`,
                    },
                  ]}
                  onPress={() => setShowAvailableOnly(!showAvailableOnly)}
                >
                  <Ionicons
                    name={showAvailableOnly ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.checkboxLabel}>Available Only</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.checkboxOption,
                    showBestsellersOnly && {
                      backgroundColor: `${Colors.primary}15`,
                    },
                  ]}
                  onPress={() => setShowBestsellersOnly(!showBestsellersOnly)}
                >
                  <Ionicons
                    name={showBestsellersOnly ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.checkboxLabel}>Bestsellers Only</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  storeSetSelectedVegType(null);
                  setMinRating(null);
                  setSortBy(null);
                  setSortOrder("asc");
                  setShowBestsellersOnly(false);
                  setShowAvailableOnly(true);
                  setPriceRange(null);
                  setPrepTimeRange(null);
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    zIndex: 10,
    backgroundColor: Colors.background,
  },

  backButton: {
    padding: 4,
  },

  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  searchInput: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },

  emptyTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: "center",
  },

  emptySubtitle: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  loadingText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.muted,
  },

  // Results Header
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  resultsCount: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  clearFilters: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  // Dish Card
  listContent: {
    paddingVertical: 8,
  },

  dishCardContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  dishHeader: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },

  dishImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },

  dishInfo: {
    flex: 1,
    justifyContent: "space-between",
  },

  dishName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 4,
  },

  categoryName: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: 6,
  },

  dishMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 4,
  },

  metaItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },

  metaLabel: {
    fontFamily: Fonts.brandBold,
    fontSize: 11,
    color: Colors.primary,
  },

  typeLabel: {
    fontFamily: Fonts.brandMedium,
    fontSize: 10,
  },

  popularText: {
    fontFamily: Fonts.brandMedium,
    fontSize: 10,
    color: "#92400e",
  },

  dishDescription: {
    fontFamily: Fonts.brand,
    fontSize: 10,
    color: Colors.muted,
  },

  // Restaurants Section
  restaurantsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 10,
  },

  restaurantsTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  restaurantsList: {
    flexGrow: 0,
  },

  restaurantsContent: {
    paddingHorizontal: 12,
    gap: 10,
  },

  restaurantCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  restaurantLogo: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },

  restaurantInfo: {
    gap: 4,
  },

  restaurantName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  rating: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  ratingCount: {
    fontFamily: Fonts.brand,
    fontSize: 10,
    color: Colors.muted,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },

  price: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  bestsellerBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  bestsellerText: {
    fontFamily: Fonts.brandBold,
    fontSize: 8,
    color: Colors.white,
  },

  delivery: {
    fontFamily: Fonts.brand,
    fontSize: 10,
    color: Colors.muted,
  },

  footerLoader: {
    marginVertical: 20,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  filterModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },

  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  filterTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },

  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  filterSection: {
    marginBottom: 24,
  },

  filterSectionTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 12,
  },

  filterOptions: {
    gap: 10,
  },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 10,
  },

  optionEmoji: {
    fontSize: 20,
  },

  optionLabel: {
    flex: 1,
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  ratingOptions: {
    flexDirection: "row",
    gap: 10,
  },

  ratingOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    gap: 6,
  },

  ratingLabel: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  filterActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
  },

  resetButtonText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },

  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.background,
  },

  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 12,
    marginBottom: 8,
  },

  checkboxLabel: {
    flex: 1,
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  // Horizontal Dishes Scroll
  dishesScrollContainer: {
    flexGrow: 0,
    backgroundColor: Colors.background,
  },

  dishesContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  dishItem: {
    width: 90,
    alignItems: "center",
    gap: 6,
  },

  dishItemSelected: {
    opacity: 1,
  },

  dishItemImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.border,
  },

  dishItemName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlign: "center",
    paddingHorizontal: 4,
    width: 90,
  },

  // Select Dish Prompt
  selectDishPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  selectDishText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.muted,
    textAlign: "center",
  },

  // Restaurant Card in List
  restaurantCardItem: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardHeaderSection: {
    flexDirection: "column",
    backgroundColor: Colors.surface,
  },

  dishImageCard: {
    width: "100%",
    height: 180,
    borderRadius: 0,
    backgroundColor: Colors.surface,
  },

  dishCardInfo: {
    flex: 1,
    justifyContent: "space-between",
    padding: 12,
  },

  cardDishName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 2,
  },

  cardCategory: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: 6,
  },

  cardTags: {
    flexDirection: "row",
    gap: 6,
  },

  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  priceTagText: {
    fontFamily: Fonts.brandBold,
    fontSize: 11,
    color: Colors.white,
  },

  bestsellerTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FCD34D20",
  },

  bestsellerTagText: {
    fontFamily: Fonts.brandBold,
    fontSize: 10,
    color: "#92400e",
  },

  restaurantSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },

  restaurantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  restName: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },

  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    gap: 4,
  },

  ratingBadgeText: {
    fontFamily: Fonts.brandBold,
    fontSize: 10,
    color: Colors.white,
  },

  restAddress: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.muted,
  },

  // Discovery Container
  discoveryContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  discoverySection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.xs,
    color: Colors.text,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  clearText: {
    fontFamily: Fonts.brandBold,
    fontSize: 13,
    color: Colors.primary,
  },
  recentSearchesList: {
    paddingRight: 16,
    gap: 12,
  },
  recentSearchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  recentSearchText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  // Cuisines Grid
  cuisinesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  cuisineItem: {
    width: "30%", // 3 items per row
    alignItems: "center",
    marginBottom: 16,
  },
  cuisineImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cuisineImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cuisineName: {
    fontFamily: Fonts.brandBold,
    fontSize: 13,
    color: Colors.text,
    marginTop: 8,
    textAlign: "center",
  },

  // Popular Items Grid
  popularItemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  popularItemCard: {
    width: "48%", // 2 items per row
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  popularItemImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  popularItemInfo: {
    padding: 10,
    gap: 4,
  },
  popularItemName: {
    fontFamily: Fonts.brandBold,
    fontSize: 14,
    color: Colors.text,
  },
  popularItemPrice: {
    fontFamily: Fonts.brandBold,
    fontSize: 12,
    color: Colors.primary,
  },
});
