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
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { useUpdateUser } from "@/hooks/useUpdateUser";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSearchPress?: () => void;
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
}: SearchBarProps) {
    const { selectedVegType, setSelectedVegType } = useVegTypeStore();
    const [showFilter, setShowFilter] = useState(false);
    const scaleAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(scaleAnim, {
            toValue: showFilter ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [showFilter, scaleAnim]);

    const { mutate: updateUser } = useUpdateUser();

    const handleSelect = (type: "veg" | "non-veg" | "vegan" | null) => {
        setSelectedVegType(type as any);
        setShowFilter(false);

        // Update backend with veg preference
        if (type) {
            const isVeg = type !== "non-veg";
            updateUser({ isVeg });
        }
    };
    const selectedOption = VEG_OPTIONS.find(opt => opt.id === selectedVegType);

    return (
        <View style={styles.wrapper}>

            {/* Search input */}
            <View style={styles.inputWrapper}>
                <View style={styles.searchIconWrap}>
                    <Ionicons name="search" size={16} color={Colors.primary} />
                </View>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.muted}
                    onPress={onSearchPress}
                />
            </View>

            {/* Veg Type Filter Button */}
            <TouchableOpacity
                style={[
                    styles.vegToggle,
                    selectedOption && { backgroundColor: `${selectedOption.color}15`, borderColor: selectedOption.color }
                ]}
                onPress={() => setShowFilter(true)}
                activeOpacity={0.8}
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
                            <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color={Colors.textSecondary} />
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
                                            selectedVegType === option.id && { color: "rgba(255,255,255,0.85)" }
                                        ]}>
                                            {option.description}
                                        </Text>
                                    </View>
                                    {selectedVegType === option.id && (
                                        <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => {
                                handleSelect(null);
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
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 4,
        height: 48,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${Colors.primary}12`,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.text,
        paddingHorizontal: 8,
    },

    // Enhanced Veg Toggle Button
    vegToggle: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        minWidth: 56,
        gap: 2,
        height: 48,
    },
    vegEmoji: {
        fontSize: 20,
    },
    vegLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.textSecondary,
        textAlign: "center",
    },

    // Enhanced Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.45)"
    },

    popupContainer: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        width: Dimensions.get('window').width - 48,
        maxWidth: 360,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },

    popupHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    popupTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },

    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },

    optionsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },

    popupOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
        gap: 12,
    },

    optionEmoji: {
        fontSize: 26,
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
        paddingVertical: 13,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: "center",
        backgroundColor: Colors.surface,
    },

    clearButtonText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
});