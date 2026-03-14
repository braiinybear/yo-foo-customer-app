import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Animated,
    Dimensions
} from "react-native";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSearchPress?: () => void;
    onFilterSelect?: (type: "veg" | "non-veg" | "vegan") => void;
    selectedVegType?: "veg" | "non-veg" | "vegan" | null;
}

interface VegTypeOption {
    id: "veg" | "non-veg" | "vegan";
    label: string;
    emoji: string;
    color: string;
    description: string;
}

const VEG_OPTIONS: VegTypeOption[] = [
    { id: "veg", label: "Vegetarian", emoji: "🥦", color: "#10B981", description: "Veg items only" },
    { id: "non-veg", label: "Non-Vegetarian", emoji: "🍗", color: "#EF4444", description: "All items" },
    { id: "vegan", label: "Vegan", emoji: "🌱", color: "#059669", description: "Plant-based only" },
];

export default function SearchBar({
    value,
    onChangeText,
    placeholder = 'Search restaurants or dishes...',
    onSearchPress,
    onFilterSelect,
    selectedVegType
}: SearchBarProps) {

    const [showFilter, setShowFilter] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(scaleAnim, {
            toValue: showFilter ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [showFilter, scaleAnim]);

    const handleSelect = (type: "veg" | "non-veg" | "vegan") => {
        onFilterSelect?.(type);
        setShowFilter(false);
    };

    const selectedOption = VEG_OPTIONS.find(opt => opt.id === selectedVegType);

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

            {/* Veg Type Filter Button */}
            <TouchableOpacity
                style={[
                    styles.vegToggle,
                    selectedOption && { backgroundColor: `${selectedOption.color}20`, borderColor: selectedOption.color }
                ]}
                onPress={() => setShowFilter(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.vegEmoji}>{selectedOption?.emoji || "🥦"}</Text>
                <Text style={[styles.vegLabel, selectedOption && { color: selectedOption.color }]}>
                    {selectedOption?.label.split(" ")[0] || "VEG"}
                </Text>
            </TouchableOpacity>

            {/* Enhanced Popup Filter */}
            <Modal
                visible={showFilter}
                transparent
                animationType="none"
                onRequestClose={() => setShowFilter(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setShowFilter(false)}
                >
                    <Animated.View 
                        style={[
                            styles.popupContainer,
                            {
                                opacity: scaleAnim,
                                transform: [
                                    {
                                        scale: scaleAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.popupHeader}>
                            <Text style={styles.popupTitle}>Filter by Type</Text>
                            <TouchableOpacity onPress={() => setShowFilter(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsContainer}>
                            {VEG_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.popupOption,
                                        selectedVegType === option.id && {
                                            backgroundColor: option.color,
                                            borderColor: option.color,
                                        }
                                    ]}
                                    onPress={() => handleSelect(option.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[
                                            styles.optionLabel,
                                            selectedVegType === option.id && { color: Colors.white }
                                        ]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[
                                            styles.optionDescription,
                                            selectedVegType === option.id && { color: Colors.white }
                                        ]}>
                                            {option.description}
                                        </Text>
                                    </View>
                                    {selectedVegType === option.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => {
                                onFilterSelect?.(null as any);
                                setShowFilter(false);
                            }}
                        >
                            <Text style={styles.clearButtonText}>Clear Filter</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

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

    // Enhanced Veg Toggle Button
    vegToggle: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.primary,
        backgroundColor: `${Colors.primary}15`,
        minWidth: 54,
        gap: 2,
        height: 46,
    },
    vegEmoji: {
        fontSize: 20,
    },
    vegLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.primary,
        textAlign: "center",
    },

    // Enhanced Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)"
    },

    popupContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        width: Dimensions.get('window').width - 40,
        maxWidth: 350,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },

    popupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: `${Colors.primary}08`,
    },

    popupTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },

    optionsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },

    popupOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        gap: 12,
    },

    optionEmoji: {
        fontSize: 24,
    },

    optionTextContainer: {
        flex: 1,
        gap: 2,
    },

    optionLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },

    optionDescription: {
        fontFamily: Fonts.brand,
        fontSize: 11,
        color: Colors.muted,
    },

    clearButton: {
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.muted,
        alignItems: "center",
    },

    clearButtonText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
});