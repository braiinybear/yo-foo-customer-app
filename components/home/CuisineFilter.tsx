import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Cuisine {
    id: string;
    label: string;
    emoji: string;
}

const CUISINES: Cuisine[] = [
    { id: "all", label: "All", emoji: "🍽️" },
    { id: "north-indian", label: "North Indian", emoji: "🍛" },
    { id: "pizza", label: "Pizza", emoji: "🍕" },
    { id: "biryani", label: "Biryani", emoji: "🥘" },
    { id: "burger", label: "Burger", emoji: "🍔" },
    { id: "chinese", label: "Chinese", emoji: "🥡" },
    { id: "desserts", label: "Desserts", emoji: "🍰" },
    { id: "south-indian", label: "South Indian", emoji: "🥞" },
    { id: "rolls", label: "Rolls", emoji: "🌯" },
    { id: "pasta", label: "Pasta", emoji: "🍝" },
];

interface CuisineFilterProps {
    selected: string;
    onSelect: (id: string) => void;
}

export default function CuisineFilter({ selected, onSelect }: CuisineFilterProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {CUISINES.map((item) => {
                    const isActive = selected === item.id;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => onSelect(item.id)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.emoji}>{item.emoji}</Text>
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {item.label}
                            </Text>
                            {isActive && <View style={styles.underline} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
    },
    chip: {
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
        position: "relative",
    },
    chipActive: {},
    emoji: {
        fontSize: 26,
        marginBottom: 4,
    },
    label: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    labelActive: {
        color: Colors.primary,
        fontFamily: Fonts.brandBold,
    },
    underline: {
        position: "absolute",
        bottom: -10,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
});
