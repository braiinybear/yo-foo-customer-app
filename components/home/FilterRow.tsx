import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const FILTERS = ["Near & Fast", "New to you", "Great Value", "Top Rated"];

interface FilterRowProps {
    activeFilter: string | null;
    onFilterSelect: (filter: string) => void;
}

export default function FilterRow({ activeFilter, onFilterSelect }: FilterRowProps) {
    return (
        <View style={styles.container}>
            {/* Filters pill with icon */}
            <TouchableOpacity style={styles.filtersPill} activeOpacity={0.7}>
                <Ionicons name="options-outline" size={14} color={Colors.text} />
                <Text style={styles.filtersPillText}>Filters</Text>
                <Ionicons name="chevron-down" size={12} color={Colors.text} />
            </TouchableOpacity>

            {FILTERS.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                    <TouchableOpacity
                        key={filter}
                        style={[styles.pill, isActive && styles.pillActive]}
                        onPress={() => onFilterSelect(filter)}
                        activeOpacity={0.75}
                    >
                        {filter === "Near & Fast" && (
                            <Ionicons
                                name="flash"
                                size={12}
                                color={isActive ? Colors.white : Colors.secondary}
                                style={{ marginRight: 2 }}
                            />
                        )}
                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filtersPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    filtersPillText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    pillActive: {
        backgroundColor: Colors.text,
        borderColor: Colors.text,
    },
    pillText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    pillTextActive: {
        color: Colors.white,
    },
});
