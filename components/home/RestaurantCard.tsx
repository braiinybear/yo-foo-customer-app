import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderBgColor, getPlaceholderImage } from "@/constants/images";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Restaurant } from "@/types/restaurants";
import { useFavoritesStore } from "@/store/useFavoritesStore";


interface RestaurantCardProps {
    restaurant: Restaurant;
    onPress?: () => void;
}

export default function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
    const { Colors } = useTheme();
    const imageUri = restaurant.image ?? getPlaceholderImage(restaurant.id);
    const bgColor = getPlaceholderBgColor(restaurant.id);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const isFavorite = useFavoritesStore((state) => state.isFavorite(restaurant.id));
    const styles = useMemo(() => createStyles(Colors), [Colors]);

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
            {/* Food visual */}
            <View style={[styles.imageWrapper, { backgroundColor: bgColor }]}>
                <Image source={{ uri: imageUri }} style={styles.image} />

                {/* Bookmark */}
                <TouchableOpacity 
                    style={styles.bookmark} 
                    activeOpacity={0.7}
                    onPress={(e) => {
                        toggleFavorite(restaurant);
                    }}
                >
                    <Ionicons 
                        name={isFavorite ? "bookmark" : "bookmark-outline"} 
                        size={18} 
                        color={isFavorite ? Colors.primary : Colors.white} 
                    />
                </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={11} color={Colors.white} />
                        <Text style={styles.ratingText}>4.5</Text>
                    </View>
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
        </TouchableOpacity>
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
        resizeMode: "cover",
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
