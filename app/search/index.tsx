import { Colors } from "@/constants/colors";
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
} from "react-native";
import { useSearchRestaurants } from "@/hooks/useRestaurantSearch";
import { router } from "expo-router";
const VEG_TYPE_OPTIONS = [
  { id: "VEG", label: "Vegetarian", emoji: "🥦", color: "#10B981" },
  { id: "NON_VEG", label: "Non-Vegetarian", emoji: "🍗", color: "#EF4444" },
  { id: "VEGAN", label: "Vegan", emoji: "🌱", color: "#059669" },
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVegType, setSelectedVegType] = useState<string | null>(null);
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
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSearchRestaurants({
      query: debouncedSearchQuery,
      type: selectedVegType as any,
      minRating: minRating ?? undefined,
      page: 1,
      limit: 5,
    });

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
  }, [selectedDishId, allDishes, showBestsellersOnly, minRating, sortBy, sortOrder]);

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
            params: { id: item.restaurantId },
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
            📍 {item.costForTwo ? `₹${item.costForTwo} for two` : "Address"} • {item.estimatedDelivery}
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
      <View style={styles.searchHeader}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes or restaurants..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={handleSearch}
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
          <Ionicons name="funnel" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Results or Empty State */}
      {!searchQuery ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color={Colors.muted} />
          <Text style={styles.emptyTitle}>Search for dishes</Text>
          <Text style={styles.emptySubtitle}>
            Find your favorite food from nearby restaurants
          </Text>
        </View>
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
              <Text style={styles.selectDishText}>Select a dish to see restaurants</Text>
            </View>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {restaurantResults.length}{" "}
                  {selectedVegType === "VEG"
                    ? "Vegetarian"
                    : selectedVegType === "NON_VEG"
                      ? "Non-Vegetarian"
                      : selectedVegType === "VEGAN"
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
                      setSelectedVegType(null);
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
                        selectedVegType === option.id && {
                          backgroundColor: option.color,
                          borderColor: option.color,
                        },
                      ]}
                      onPress={() => setSelectedVegType(option.id)}
                    >
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                      <Text
                        style={[
                          styles.optionLabel,
                          selectedVegType === option.id && {
                            color: Colors.white,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selectedVegType === option.id && (
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
                  setSelectedVegType(null);
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

const styles = StyleSheet.create({
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
  },

  backButton: {
    padding: 4,
  },

  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.text,
  },

  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}15`,
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
    backgroundColor: Colors.background,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
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
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },

  applyButtonText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },

  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
  },

  dishImageCard: {
    width: "100%",
    height: 180,
    borderRadius: 0,
    backgroundColor: Colors.background,
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
});
