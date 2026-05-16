import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Dimensions,
    Pressable
} from "react-native";
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming, 
    interpolate, 
    Extrapolate 
} from "react-native-reanimated";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { AnimatedPressable } from "../AnimatedPressable";

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
    const { Colors } = useTheme();
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    const { selectedVegType, setSelectedVegType } = useVegTypeStore();
    const [showFilter, setShowFilter] = useState(false);
    
    const focusAnim = useSharedValue(0);
    const filterScale = useSharedValue(0);

    React.useEffect(() => {
        filterScale.value = withSpring(showFilter ? 1 : 0, { damping: 15, stiffness: 150 });
    }, [showFilter]);

    const { mutate: updateUser } = useUpdateUser();

    const handleSelect = (type: "veg" | "non-veg" | "vegan" | null) => {
        setSelectedVegType(type as any);
        setShowFilter(false);

        if (type) {
            const isVeg = type !== "non-veg";
            updateUser({ isVeg });
        }
    };

    const selectedOption = VEG_OPTIONS.find(opt => opt.id === selectedVegType);

    const rInputWrapperStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(focusAnim.value, [0, 1], [1, 1.02]) }],
        borderColor: interpolate(focusAnim.value, [0, 1], [0, 1]) === 1 ? Colors.primary : "rgba(255,255,255,0.15)",
    }));

    const rPopupStyle = useAnimatedStyle(() => ({
        opacity: filterScale.value,
        transform: [{ scale: interpolate(filterScale.value, [0, 1], [0.8, 1]) }],
    }));

    return (
        <View style={styles.wrapper}>
            {/* Search input with elastic focus */}
            <Animated.View style={[styles.inputWrapper, rInputWrapperStyle]}>
                <View style={styles.searchIconWrap}>
                    <Ionicons name="search" size={16} color={Colors.primary} />
                </View>
                {onSearchPress ? (
                    <Pressable style={styles.inputPressable} onPress={onSearchPress}>
                        <Text style={[styles.inputPlaceholder, { color: "rgba(255,255,255,0.4)" }]}>
                            {value || placeholder}
                        </Text>
                    </Pressable>
                ) : (
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        onFocus={() => { focusAnim.value = withSpring(1); }}
                        onBlur={() => { focusAnim.value = withSpring(0); }}
                    />
                )}
            </Animated.View>

            {/* Veg Type Filter Button */}
            <AnimatedPressable
                style={[
                    styles.vegToggle,
                    selectedOption && { backgroundColor: `${selectedOption.color}15`, borderColor: selectedOption.color }
                ]}
                onPress={() => setShowFilter(true)}
                scaleIn={0.9}
            >
                <Text style={styles.vegEmoji}>{selectedOption?.emoji || "🥦"}</Text>
                <Text style={[styles.vegLabel, selectedOption && { color: selectedOption.color }]}>
                    {selectedOption?.label.split(" ")[0] || "VEG"}
                </Text>
            </AnimatedPressable>

            {/* Reanimated Filter Modal */}
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
                    <Animated.View style={[styles.popupContainer, rPopupStyle]}>
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

const createStyles = (Colors: any) => StyleSheet.create({
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
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 4,
        height: 48,
    },
    inputPressable: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    inputPlaceholder: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
    },
    searchIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.white,
        paddingHorizontal: 8,
    },
    vegToggle: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.15)",
        backgroundColor: "rgba(255,255,255,0.08)",
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
        color: "rgba(255,255,255,0.8)",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.45)"
    },
    popupContainer: {
        backgroundColor: Colors.background,
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
        backgroundColor: Colors.background,
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
        backgroundColor: Colors.surface,
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
        backgroundColor: Colors.border + "15",
    },
    clearButtonText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
});