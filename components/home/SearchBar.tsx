import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    vegMode?: boolean;
    onVegToggle?: (val: boolean) => void;
    placeholder?: string;
    onSearchPress?: () => void;
}

export default function SearchBar({
    value,
    onChangeText,
    vegMode,
    onVegToggle,
    placeholder = 'Search restaurants or dishes...',
    onSearchPress
}: SearchBarProps) {
    return (
        <View style={styles.wrapper}>
            {/* Search input */}
            <View style={styles.inputWrapper}>
                <Ionicons name="search" size={18} color={Colors.primary} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.muted}
                    onPress={onSearchPress}
                />
                <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
                    <Ionicons name="mic" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Veg mode toggle */}
            <View style={styles.vegToggle}>
                <Text style={styles.vegLabel}>VEG{"\n"}MODE</Text>
                <Switch
                    value={vegMode}
                    onValueChange={onVegToggle}
                    trackColor={{ false: Colors.border, true: Colors.success }}
                    thumbColor={Colors.white}
                    style={styles.switch}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
        backgroundColor: Colors.background,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 10,
        height: 46,
    },
    searchIcon: {
        marginRight: 6,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    micButton: {
        padding: 4,
    },
    vegToggle: {
        alignItems: "center",
    },
    vegLabel: {
        fontFamily: Fonts.brandBlack,
        fontSize: 9,
        color: Colors.success,
        textAlign: "center",
        lineHeight: 11,
    },
    switch: {
        transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
    },
});
