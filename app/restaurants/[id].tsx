import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderImage } from "@/constants/images";
import { useRestaurantDetail } from "@/hooks/useRestaurants";
import { useCartStore } from "@/store/useCartStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";

export default function RestaurantDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: restaurant, isPending, error, refetch } = useRestaurantDetail(id);
    const { addItem, items, updateQuantity, totalAmount } = useCartStore();

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const cartCount = items.length;
    const cartTotal = totalAmount;

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
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.restaurantName}>{restaurant.name}</Text>
                        <Text style={styles.cuisineText}>{restaurant.cuisineTypes?.join(", ")}</Text>
                        <Text style={styles.addressText}>{restaurant.address}</Text>
                    </View>
                </View>

                <View style={styles.menuContainer}>
                    {restaurant.menuCategories.map((category) => (
                        <View key={category.id} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>
                                {category.name} ({category.items.length})
                            </Text>

                            {category.items.map((item) => {
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
                    ))}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            {cartCount > 0 && (
                <View style={styles.cartBannerWrapper}>
                    <TouchableOpacity
                        style={styles.cartBanner}
                        activeOpacity={0.9}
                        onPress={() => router.push('/(tabs)/cart')}
                    >
                        <View>
                            <Text style={styles.cartCountText}>{cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}</Text>
                            <Text style={styles.cartTotalText}>₹{cartTotal} plus taxes</Text>
                        </View>
                        <View style={styles.viewCartAction}>
                            <Text style={styles.viewCartText}>View Cart</Text>
                            <Ionicons name="cart" size={20} color={Colors.white} />
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
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    infoSection: {
        padding: 16,
    },
    restaurantName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xxl,
        color: Colors.text,
        marginBottom: 4,
    },
    cuisineText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    addressText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
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
        marginBottom: 12,
    },
    menuItem: {
        flexDirection: "row",
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderColor: "#F0F0F0",
        gap: 16,
        alignItems: "flex-start",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 2,
    },
    itemPrice: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 6,
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
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        width: 100,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
    },
    addButtonText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 14,
        color: Colors.primary,
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
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        width: 100,
        height: 38,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
        bottom: Platform.OS === 'ios' ? 30 : 20,
        left: 16,
        right: 16,
    },
    cartBanner: {
        backgroundColor: Colors.success,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    cartCountText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.white,
    },
    cartTotalText: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.white,
        opacity: 0.9,
    },
    viewCartAction: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    viewCartText: {
        fontFamily: Fonts.brandBold,
        fontSize: 14,
        color: Colors.white,
    },
});