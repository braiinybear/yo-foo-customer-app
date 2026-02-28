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

const CUISINE_ICON = "🍽️";

interface CuisineFilterProps {
    cuisines: string[];
    selected: string;
    onSelect: (id: string) => void;
}

export default function CuisineFilter({ cuisines, selected, onSelect }: CuisineFilterProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {cuisines.map((item) => {
                    const isActive = selected === item;
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, isActive && styles.chipActive]}
                            onPress={() => onSelect(item)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.emoji}>{CUISINE_ICON}</Text>
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {item}
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
