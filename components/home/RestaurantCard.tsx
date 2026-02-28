import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderBgColor, getPlaceholderImage } from "@/constants/images";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Restaurant } from "@/types/restaurants";


interface RestaurantCardProps {
    restaurant: Restaurant;
    onPress?: () => void;
}

export default function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
    const imageUri = restaurant.image ?? getPlaceholderImage(restaurant.id);
    const bgColor = getPlaceholderBgColor(restaurant.id);

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
            {/* Food visual */}
            <View style={[styles.imageWrapper, { backgroundColor: bgColor }]}>
                <Image source={{ uri: imageUri }} style={styles.image} />

                {/* Offer badge */}
                <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>FREE DELIVERY</Text>
                </View>

                {/* Bookmark */}
                <TouchableOpacity style={styles.bookmark} activeOpacity={0.7}>
                    <Ionicons name="bookmark-outline" size={16} color={Colors.white} />
                </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={11} color={Colors.white} />
                        <Text style={styles.ratingText}>4.0</Text>
                    </View>
                </View>

                <Text style={styles.cuisine} numberOfLines={1}>
                    {restaurant.cuisineTypes?.join(" · ") || "Various Cuisines"}
                </Text>
                <Text style={styles.priceHint}>₹{restaurant.costForTwo} for two</Text>

                <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="lightning-bolt" size={12} color={Colors.success} />
                    <Text style={styles.metaText}>30-35 mins</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.metaText}>1.2 km</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.metaText}>Free Delivery</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.background,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 3,
        margin:5
    },
    imageWrapper: {
        height: 160,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    foodEmoji: {
        fontSize: 72,
    },
    image: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    offerBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: "rgba(0,0,0,0.65)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    offerText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    bookmark: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(0,0,0,0.35)",
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        padding: 12,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    name: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        flex: 1,
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.success,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 2,
    },
    ratingText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    cuisine: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: 2,
    },
    priceHint: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    metaText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    dot: {
        color: Colors.muted,
        fontSize: FontSize.xs,
    },
});
