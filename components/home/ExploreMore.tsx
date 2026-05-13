import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ExploreItem {
    id: string;
    label: string;
    emoji: string;
    bgColor: string;
}

const EXPLORE_ITEMS: ExploreItem[] = [
    { id: "offers", label: "Offers", emoji: "🏷️", bgColor: "#EEF2FF" },
    { id: "top10", label: "Top 10", emoji: "🏆", bgColor: "#FFFBEB" },
    { id: "train", label: "Food on train", emoji: "🚆", bgColor: "#F0F9FF" },
    { id: "collections", label: "Collections", emoji: "📦", bgColor: "#FFF7ED" },
    { id: "new", label: "New arrivals", emoji: "✨", bgColor: "#F0FDF4" },
];

export default function ExploreMore() {
    const { Colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Explore More</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {EXPLORE_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, { backgroundColor: isDark ? Colors.surface : item.bgColor }]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.emoji}>{item.emoji}</Text>
                        <Text style={styles.label}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        paddingVertical: 16,
        backgroundColor: Colors.background,
        borderTopWidth: 8,
        borderTopColor: Colors.border,
    },
    heading: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        paddingHorizontal: 16,
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    scroll: {
        paddingHorizontal: 14,
        gap: 10,
    },
    card: {
        width: 90,
        height: 90,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emoji: {
        fontSize: 28,
    },
    label: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
        textAlign: "center",
        paddingHorizontal: 4,
    },
});
