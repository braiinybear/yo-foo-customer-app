import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderImage } from "@/constants/images";
import { useRestaurantDetail } from "@/hooks/useRestaurants";
import { useCartStore } from "@/store/useCartStore";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { showAlert } from "@/store/useAlertStore";
import { MenuCategory, MenuItem } from "@/types/restaurants";

export default function RestaurantDetailScreen() {
    const { id, dishName} = useLocalSearchParams<{ id: string; dishName?: string }>();
    const insets = useSafeAreaInsets();
    const { data: restaurant, isPending, error, refetch } = useRestaurantDetail(id);
    const { addItem, items, updateQuantity, totalAmount } = useCartStore();
    const { selectedVegType } = useVegTypeStore();

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleClearCart = useCallback(() => {
        showAlert(
            'Clear Cart',
            'Are you sure you want to remove all items from your cart?',
            [
                {
                    text: 'Cancel',
                    onPress: () => {},
                    style: 'cancel',
                },
                {
                    text: 'Clear',
                    onPress: () => {
                        useCartStore.setState({ items: [] });
                    },
                    style: 'destructive',
                },
            ]
        );
    }, []);

    // Helper function to convert store format to API format
    const storeTypeToAPIType = (storeType: string | null): string | null => {
        if (storeType === "veg") return "VEG";
        if (storeType === "non-veg") return "NON_VEG";
        if (storeType === "vegan") return "VEGAN";
        return null;
    };

    // Helper function to check if an item matches the selected veg type
    const matchesVegType = (itemType: string | null): boolean => {
        if (!selectedVegType) return true;
        if (!itemType) return false;
        
        // For non-veg, show both non-veg and vegetarian items
        if (selectedVegType === "non-veg") {
            return itemType === "NON_VEG" || itemType === "VEG";
        }
        
        // For veg and vegan, show only vegetarian items
        return itemType === "VEG";
    };

    const cartCount = items.length;
    const cartTotal = totalAmount;
    const cartBannerBottom = Math.max(insets.bottom + 8, 24);

    // Reorder menu categories to show searched item's category at the top
    const getReorderedCategories = () => {
        if (!dishName || !restaurant?.menuCategories) {
            return restaurant?.menuCategories || [];
        }

        // Find the category containing the searched dish
        let categoryWithSearchedItem : MenuCategory | null = null;
        for (const category of restaurant.menuCategories) {
            const item = category.items.find((i: MenuItem) => String(i.name) === String(dishName));
            if (item) {
                categoryWithSearchedItem = category;
                break;
            }
        }

        // If found, reorder with searched category at the top
        if (categoryWithSearchedItem) {
            return [
                categoryWithSearchedItem,
                ...restaurant.menuCategories.filter((cat) => cat.id !== categoryWithSearchedItem.id),
            ];
        }

        return restaurant.menuCategories;
    };

    const reorderedCategories = getReorderedCategories();

    if (isPending) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error || !restaurant) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load restaurant details.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
            >
                <View>
                    <View style={styles.imageHeader}>
                        <Image
                            source={{ uri: restaurant.image ?? getPlaceholderImage(restaurant.id) }}
                            style={styles.bannerImage}
                        />
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={Colors.white} />
                        </TouchableOpacity>
                        {restaurant.logo && (
                            <Image
                                source={{ uri: restaurant.logo }}
                                style={styles.logoOverlay}
                            />
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.headerInfoTop}>
                            <View style={styles.nameRatingContainer}>
                                <View style={styles.nameLogoContainer}>
                                    {!restaurant.logo && (
                                        <View style={styles.logoPlaceholder}>
                                            <Text style={styles.logoEmoji}>🍽️</Text>
                                        </View>
                                    )}
                                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Ionicons name="star" size={14} color="#FFB800" />
                                    <Text style={styles.ratingText}>4.5</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.cuisineText}>{restaurant.cuisineTypes?.join(", ")}</Text>
                        <View style={styles.deliveryInfoContainer}>
                            <View style={styles.deliveryInfoItem}>
                                <Ionicons name="time" size={14} color={Colors.primary} />
                                <Text style={styles.deliveryInfoText}>30-40 mins</Text>
                            </View>
                            <View style={styles.deliveryDivider} />
                            <View style={styles.deliveryInfoItem}>
                                <Ionicons name="location" size={14} color={Colors.primary} />
                                <Text style={styles.deliveryInfoText}>2.5 km away</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Searched Item Section */}
                {dishName && (() => {
                    let searchedItem: any = null;
                    let searchedCategory: any = null;
                    
                    // Search for the dish in all categories
                    for (const category of restaurant.menuCategories) {
                        const item = category.items.find((i: any) => String(i.name) === String(dishName));
                        if (item) {
                            searchedItem = item;
                            searchedCategory = category;   
                            break;
                        }
                    }
                    
                    if (searchedItem && searchedCategory) {
                        const cartItem = items.find((i) => i.id === searchedItem.id);
                        return (
                            <View style={styles.searchedItemSection}>
                                <View style={styles.searchedItemHeader}>
                                    <Ionicons name="search" size={14} color={Colors.primary} />
                                    <Text style={styles.searchedItemLabel}>Searched Item</Text>
                                </View>
                                <View style={styles.searchedMenuItemCard}>
                                    <View style={styles.itemInfo}>
                                        <View style={styles.typeIconContainer}>
                                            <Ionicons
                                                name="caret-up-circle"
                                                size={16}
                                                color={searchedItem.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                            />
                                            {searchedItem.isBestseller && (
                                                <View style={styles.bestsellerBadge}>
                                                    <Ionicons name="star" size={10} color="#FFB800" />
                                                    <Text style={styles.bestsellerText}>Bestseller</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.itemName}>{searchedItem.name}</Text>
                                        <Text style={styles.itemPrice}>₹{searchedItem.price}</Text>
                                        <Text style={styles.itemDesc} numberOfLines={3}>
                                            {searchedItem.description}
                                        </Text>
                                    </View>

                                    <View style={styles.imageActionContainer}>
                                        {searchedItem.image ? (
                                            <Image source={{ uri: searchedItem.image }} style={styles.itemImage} />
                                        ) : (
                                            <Image
                                                source={{ uri: getPlaceholderImage(searchedItem.id) }}
                                                style={styles.itemImage}
                                            />
                                        )}
                                        <View style={styles.actionButtonWrapper}>
                                            {cartItem ? (
                                                <View style={styles.quantityControls}>
                                                    <TouchableOpacity
                                                        onPress={() => updateQuantity(searchedItem.id, cartItem.quantity - 1)}
                                                        style={styles.qtyBtn}
                                                        activeOpacity={0.6}
                                                    >
                                                        <Ionicons name="remove" size={18} color={Colors.primary} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                                                    <TouchableOpacity
                                                        onPress={() => updateQuantity(searchedItem.id, cartItem.quantity + 1)}
                                                        style={styles.qtyBtn}
                                                        activeOpacity={0.6}
                                                    >
                                                        <Ionicons name="add" size={18} color={Colors.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.addButton}
                                                    onPress={() => addItem(searchedItem, restaurant.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.addButtonText}>ADD</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    }
                    return null;
                })()}

                <View style={styles.menuContainer}>
                    {reorderedCategories.map((category) => {
                        // Filter items by veg type
                        const filteredItems = category.items.filter((item: MenuItem) => matchesVegType(item.type));
                        
                        // Sort items: when non-veg is selected, show non-veg first, then veg
                        const sortedItems = filteredItems.sort((a: MenuItem, b: MenuItem) => {
                            if (selectedVegType === "non-veg") {
                                // Non-veg first, then veg
                                if (a.type === "NON_VEG" && b.type === "VEG") return -1;
                                if (a.type === "VEG" && b.type === "NON_VEG") return 1;
                            }
                            // For vegan/veg, no special sorting needed as they're all VEG
                            return 0;
                        });
                        
                        // Don't show category if no items match the filter
                        if (sortedItems.length === 0) return null;

                        return (
                        <View key={category.id} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>
                                {category.name} ({sortedItems.length})
                            </Text>

                            {sortedItems.map((item: MenuItem) => {
                                const cartItem = items.find((i) => i.id === item.id);
                                return (
                                    <View key={item.id} style={styles.menuItem}>
                                        <View style={styles.itemInfo}>
                                            <View style={styles.typeIconContainer}>
                                                <Ionicons
                                                    name="caret-up-circle"
                                                    size={16}
                                                    color={item.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                                />
                                                {item.isBestseller && (
                                                    <View style={styles.bestsellerBadge}>
                                                        <Ionicons name="star" size={10} color="#FFB800" />
                                                        <Text style={styles.bestsellerText}>Bestseller</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemPrice}>₹{item.price}</Text>
                                            <Text style={styles.itemDesc} numberOfLines={3}>
                                                {item.description}
                                            </Text>
                                        </View>

                                        <View style={styles.imageActionContainer}>
                                            {item.image ? (
                                                <Image source={{ uri: item.image }} style={styles.itemImage} />
                                            ) : (
                                                <Image
                                                    source={{ uri: getPlaceholderImage(item.id) }}
                                                    style={styles.itemImage}
                                                />
                                            )}
                                            <View style={styles.actionButtonWrapper}>
                                                {cartItem ? (
                                                    <View style={styles.quantityControls}>
                                                        <TouchableOpacity
                                                            onPress={() => updateQuantity(item.id, cartItem.quantity - 1)}
                                                            style={styles.qtyBtn}
                                                            activeOpacity={0.6}
                                                        >
                                                            <Ionicons name="remove" size={18} color={Colors.primary} />
                                                        </TouchableOpacity>
                                                        <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                                                        <TouchableOpacity
                                                            onPress={() => updateQuantity(item.id, cartItem.quantity + 1)}
                                                            style={styles.qtyBtn}
                                                            activeOpacity={0.6}
                                                        >
                                                            <Ionicons name="add" size={18} color={Colors.primary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity
                                                        style={styles.addButton}
                                                        onPress={() => addItem(item, restaurant.id)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text style={styles.addButtonText}>ADD</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                        );
                    })}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {cartCount > 0 && (
                <View style={[styles.cartBannerWrapper, { bottom: cartBannerBottom }]}>
                    <TouchableOpacity
                        style={styles.cartBanner}
                        activeOpacity={0.85}
                        onPress={() => router.push('/(tabs)/cart')}
                    >
                        <View style={styles.cartContentLeft}>
                            <View style={styles.cartItemImagesContainer}>
                                {items.slice(0, 3).map((item, index) => (
                                    <Image
                                        key={item.id}
                                        source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                                        style={[styles.cartItemImage, { marginLeft: index * -10 }]}
                                    />
                                ))}
                            </View>
                            <View style={styles.cartTextSection}>
                                <Text style={styles.cartCountText}>{cartCount} ITEMS</Text>
                                <Text style={styles.cartTotalText}>₹{cartTotal}<Text style={styles.cartTaxText}> + tax</Text></Text>
                            </View>
                        </View>
                        <View style={styles.cartActions}>
                            <TouchableOpacity 
                                style={styles.clearCartBtn}
                                onPress={handleClearCart}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={18} color={Colors.white} />
                            </TouchableOpacity>
                            <View style={styles.viewCartAction}>
                                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 8,
    },
    retryText: {
        fontFamily: Fonts.brandBold,
        color: Colors.white,
    },
    imageHeader: {
        height: 220,
        position: "relative",
        overflow: "hidden",
    },
    logoOverlay: {
        position: "absolute",
        bottom: 10,
        left: 16,
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: Colors.white,
        borderWidth: 3,
        borderColor: Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        resizeMode: "cover",
    },
    bannerImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    placeholderImage: {
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderEmoji: {
        fontSize: 60,
    },
    backButton: {
        position: "absolute",
        top: 40,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    infoSection: {
        paddingTop: 30,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    headerInfoTop: {
        marginBottom: 12,
    },
    nameRatingContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
        flex: 1,
    },
    nameLogoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: "center",
        alignItems: "center",
    },
    logoEmoji: {
        fontSize: 24,
    },
    restaurantName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        flex: 1,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    ratingText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: "#B88E00",
    },
    cuisineText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 10,
    },
    deliveryInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: `${Colors.primary}08`,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    deliveryInfoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    deliveryInfoText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    deliveryDivider: {
        width: 1,
        height: 16,
        backgroundColor: "#E0E0E0",
    },
    menuContainer: {
        paddingHorizontal: 16,
    },
    categorySection: {
        marginTop: 24,
    },
    categoryTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: 16,
        paddingLeft: 4,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    menuItem: {
        flexDirection: "row",
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: Colors.white,
        gap: 12,
        alignItems: "flex-start",
        borderWidth: 1,
        borderColor: "#F0F0F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 4,
        lineHeight: 20,
    },
    itemPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: 16,
        color: Colors.primary,
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    itemDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 16,
    },
    typeIconContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 8,
    },
    bestsellerBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF9E6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    bestsellerText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        color: "#B88E00",
    },
    imageActionContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        marginLeft: 16,
    },
    itemImage: {
        width: 120,
        height: 120,
        borderRadius: 16,
        resizeMode: 'cover',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    itemImagePlaceholder: {
        backgroundColor: Colors.light,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    actionButtonWrapper: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    actionSection: {
        alignItems: "center",
        justifyContent: "center",
        width: 100,
    },
    addButton: {
        backgroundColor: Colors.primary,
        borderWidth: 0,
        borderColor: Colors.primary,
        borderRadius: 10,
        width: 100,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
        position: 'relative',
    },
    addButtonText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 14,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    addIcon: {
        position: 'absolute',
        top: -2,
        right: 4,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderRadius: 10,
        width: 100,
        height: 38,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    qtyText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 14,
        color: Colors.primary,
        textAlign: "center",
    },
    cartBannerWrapper: {
        position: "absolute",
        left: 16,
        right: 16,
    },
    cartBanner: {
        backgroundColor: Colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    cartContentLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    cartItemImagesContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: 95,
        height: 50,
    },
    cartItemImage: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: Colors.white,
        resizeMode: "cover",
    },
    cartItemImageMore: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255, 255, 255, 0.35)",
        borderWidth: 2,
        borderColor: Colors.white,
        justifyContent: "center",
        alignItems: "center",
    },
    cartMoreText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.white,
    },
    cartTextSection: {
        flex: 1,
        marginLeft: 10,
        justifyContent: "space-between",
    },
    cartCountText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.white,
        lineHeight: 16,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    cartTotalText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 15,
        color: Colors.white,
        lineHeight: 18,
    },
    cartTaxText: {
        fontFamily: Fonts.brand,
        fontSize: 11,
        opacity: 0.8,
    },
    cartActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    clearCartBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    viewCartAction: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        width: 40,
        height: 36,
    },
    viewCartText: {
        fontFamily: Fonts.brandBold,
        fontSize: 13,
        color: Colors.white,
    },
    searchedItemSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    searchedItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    searchedItemLabel: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    searchedMenuItemCard: {
        flexDirection: "row",
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 0,
        borderRadius: 12,
        backgroundColor: Colors.white,
        gap: 12,
        alignItems: "flex-start",
        borderWidth: 1,
        borderColor: "#F0F0F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
});