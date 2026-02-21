import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useRestaurantDetail } from "@/hooks/useRestaurants";
import { Ionicons} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function RestaurantDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: restaurant, isPending, error } = useRestaurantDetail(id);

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
            <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
                <View>
                    <View style={styles.imageHeader}>
                        {restaurant.image ? (
                            <Image source={{ uri: restaurant.image }} style={styles.bannerImage} />
                        ) : (
                            <View style={[styles.bannerImage, styles.placeholderImage]}>
                                <Text style={styles.placeholderEmoji}>🍽️</Text>
                            </View>
                        )}
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

                            {category.items.map((item) => (
                                <View key={item.id} style={styles.menuItem}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemPrice}>₹{item.price}</Text>
                                        <Text style={styles.itemDesc} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        marginTop: 20,
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
        top: 20,
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
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: "#f0f0f0",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    itemPrice: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginVertical: 4,
    },
    itemDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    cartButton: {
        backgroundColor: Colors.success,
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    viewCartText: {
        fontFamily: Fonts.brandBold,
        fontSize: 14,
        color: Colors.white,
    },
});