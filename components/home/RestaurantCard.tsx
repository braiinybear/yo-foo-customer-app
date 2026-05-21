import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderBgColor, getPlaceholderImage } from "@/constants/images";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo, memo, useCallback } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Restaurant } from "@/types/restaurants";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { AnimatedPressable } from "../AnimatedPressable";


interface RestaurantCardProps {
    restaurant: Restaurant;
    onPress?: () => void;
    index?: number;
}

const RestaurantCard = ({ restaurant, onPress, index = 0 }: RestaurantCardProps) => {
    const { Colors } = useTheme();
    const imageUri = restaurant.image ?? getPlaceholderImage(restaurant.id);
    const bgColor = getPlaceholderBgColor(restaurant.id);
    
    // Simplified store subscription — only re-render when THIS card's favorite status changes
    const isFavorite = useFavoritesStore(
      useCallback((state) => state.favorites.some((r) => r.id === restaurant.id), [restaurant.id])
    );
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    
    const styles = useMemo(() => createStyles(Colors), [Colors]);

    const handleToggleFavorite = useCallback(() => {
        toggleFavorite(restaurant);
    }, [toggleFavorite, restaurant]);

    return (
        <AnimatedPressable 
            style={styles.card} 
            onPress={onPress}
            scaleIn={0.97}
        >
            {/* Food visual */}
            <View style={[styles.imageWrapper, { backgroundColor: bgColor }]}>
                <Image 
                    source={{ uri: imageUri }} 
                    style={styles.image}
                    cachePolicy="memory-disk"
                    recyclingKey={restaurant.id}
                    transition={0}
                />

                {/* Bookmark — AnimatedPressable already provides press feedback */}
                <AnimatedPressable 
                    style={styles.bookmark} 
                    onPress={handleToggleFavorite}
                    scaleIn={0.75}
                >
                    <Ionicons 
                        name={isFavorite ? "bookmark" : "bookmark-outline"} 
                        size={18} 
                        color={isFavorite ? Colors.primary : Colors.white} 
                    />
                </AnimatedPressable>
            </View>

            {/* Bottom info */}
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
                </View>

                <Text style={styles.cuisine} numberOfLines={1}>
                    {restaurant.cuisineTypes?.join(" · ") || "Various Cuisines"}
                </Text>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.metaText}>30-40 min</Text>
                    </View>
                    <View style={styles.dot} />
                    <Text style={styles.priceHint}>₹{restaurant.costForTwo} for two</Text>
                </View>
            </View>
        </AnimatedPressable>
    );
}


const createStyles = (Colors: any) => StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        overflow: "hidden",
        marginHorizontal: 0,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    imageWrapper: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    bookmark: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(0,0,0,0.35)",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        flex: 1,
        marginRight: 8,
    },
    cuisine: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 10,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary, // Gold for premium feel
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 3,
    },
    ratingText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: Colors.muted,
    },
    priceHint: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
});

export default memo(RestaurantCard);
