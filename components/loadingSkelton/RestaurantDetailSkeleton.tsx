import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Animated from "react-native-reanimated";
import { useShimmer } from "@/hooks/useShimmer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SkeletonItem = ({ style, pulseStyle }: { style: any; pulseStyle: any }) => {
    const { Colors } = useTheme();

    return (
        <Animated.View
            style={[
                style,
                {
                    backgroundColor: Colors.border,
                },
                pulseStyle
            ]}
        />
    );
};

export default function RestaurantDetailSkeleton() {
    const { Colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { pulseStyle } = useShimmer();

    return (
        <View style={[styles.root, { backgroundColor: Colors.background }]}>
            {/* Top Fake Header Navigation Bar */}
            <View style={[styles.fakeHeader, { paddingTop: insets.top, backgroundColor: Colors.surface }]}>
                <View style={styles.fakeHeaderRow}>
                    <SkeletonItem style={styles.circleBtn} pulseStyle={pulseStyle} />
                    <SkeletonItem style={styles.headerTitleLine} pulseStyle={pulseStyle} />
                    <View style={styles.fakeHeaderRight}>
                        <SkeletonItem style={styles.circleBtn} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.circleBtn} pulseStyle={pulseStyle} />
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Large Parallax Banner Image Placeholder */}
                <View style={[styles.imageHeader, { backgroundColor: isDark ? "#2c2c2c" : "#e0e0e0" }]}>
                    <SkeletonItem style={StyleSheet.absoluteFill} pulseStyle={pulseStyle} />
                </View>

                {/* 2. Restaurant Floating Details Card Placeholder */}
                <View style={styles.detailsCardWrapper}>
                    <View style={[styles.restaurantMainCard, { backgroundColor: Colors.surface }]}>
                        {/* Title & Badge */}
                        <View style={styles.nameHeaderRow}>
                            <SkeletonItem style={styles.restaurantTitleLine} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.verifiedBadgeLine} pulseStyle={pulseStyle} />
                        </View>

                        {/* Description */}
                        <SkeletonItem style={styles.descriptionLine} pulseStyle={pulseStyle} />
                        <SkeletonItem style={[styles.descriptionLine, { width: "70%" }]} pulseStyle={pulseStyle} />

                        {/* Cuisine Chips */}
                        <View style={styles.cuisinesContainer}>
                            {[1, 2, 3].map((i) => (
                                <SkeletonItem key={i} style={styles.cuisineChip} pulseStyle={pulseStyle} />
                            ))}
                        </View>

                        {/* Timing / Location Strip */}
                        <View style={styles.locationTimingStrip}>
                            <SkeletonItem style={styles.stripLine} pulseStyle={pulseStyle} />
                            <View style={styles.stripDivider} />
                            <SkeletonItem style={styles.stripLineShort} pulseStyle={pulseStyle} />
                        </View>
                    </View>

                    {/* Stats Metric Strip Grid */}
                    <View style={styles.statsStripGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={[styles.statCard, { backgroundColor: Colors.surface }]}>
                                <SkeletonItem style={styles.statIcon} pulseStyle={pulseStyle} />
                                <SkeletonItem style={styles.statValue} pulseStyle={pulseStyle} />
                                <SkeletonItem style={styles.statLabel} pulseStyle={pulseStyle} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* 3. Sticky Search Bar and Category Navigator Mock */}
                <View style={[styles.stickyBarContainer, { backgroundColor: Colors.background }]}>
                    <SkeletonItem style={styles.searchBarWrapper} pulseStyle={pulseStyle} />
                    <View style={styles.filterChipsRow}>
                        {[1, 2, 3, 4].map((i) => (
                            <SkeletonItem key={i} style={styles.filterChip} pulseStyle={pulseStyle} />
                        ))}
                    </View>
                    <View style={styles.categoriesTabRow}>
                        {[1, 2, 3].map((i) => (
                            <SkeletonItem key={i} style={styles.categoryTab} pulseStyle={pulseStyle} />
                        ))}
                    </View>
                </View>

                {/* 4. Menu List Sections */}
                <View style={styles.menuContainer}>
                    {[1, 2].map((sectionId) => (
                        <View key={sectionId} style={styles.categorySection}>
                            {/* Accordion Title Header */}
                            <View style={[styles.categoryHeaderAccordion, { backgroundColor: Colors.surface }]}>
                                <SkeletonItem style={styles.accordionTitle} pulseStyle={pulseStyle} />
                                <SkeletonItem style={styles.accordionChevron} pulseStyle={pulseStyle} />
                            </View>

                            {/* Dishes List */}
                            {[1, 2].map((itemId) => (
                                <View key={itemId} style={[styles.menuItemCard, { backgroundColor: Colors.surface }]}>
                                    <View style={styles.itemMetaLeft}>
                                        <SkeletonItem style={styles.vegTag} pulseStyle={pulseStyle} />
                                        <SkeletonItem style={styles.dishName} pulseStyle={pulseStyle} />
                                        <SkeletonItem style={styles.dishPrice} pulseStyle={pulseStyle} />
                                        <SkeletonItem style={styles.dishDesc} pulseStyle={pulseStyle} />
                                        <SkeletonItem style={[styles.dishDesc, { width: "80%" }]} pulseStyle={pulseStyle} />
                                    </View>
                                    <View style={styles.itemImageRight}>
                                        <SkeletonItem style={styles.dishImage} pulseStyle={pulseStyle} />
                                        <SkeletonItem style={styles.addBtn} pulseStyle={pulseStyle} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    fakeHeader: {
        height: 56,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: "transparent",
        zIndex: 10,
    },
    fakeHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    fakeHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    circleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    headerTitleLine: {
        flex: 1,
        height: 18,
        borderRadius: 4,
        marginHorizontal: 16,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    imageHeader: {
        height: 240,
        width: "100%",
    },
    detailsCardWrapper: {
        marginTop: -35,
        paddingHorizontal: 16,
        zIndex: 5,
    },
    restaurantMainCard: {
        borderRadius: 22,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
        gap: 12,
    },
    nameHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    restaurantTitleLine: {
        height: 24,
        width: "60%",
        borderRadius: 6,
    },
    verifiedBadgeLine: {
        height: 20,
        width: 75,
        borderRadius: 10,
    },
    descriptionLine: {
        height: 14,
        width: "100%",
        borderRadius: 4,
    },
    cuisinesContainer: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    cuisineChip: {
        width: 80,
        height: 26,
        borderRadius: 13,
    },
    locationTimingStrip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
        paddingTop: 12,
    },
    stripLine: {
        flex: 1,
        height: 14,
        borderRadius: 4,
    },
    stripLineShort: {
        width: 70,
        height: 14,
        borderRadius: 4,
    },
    stripDivider: {
        width: 1,
        height: 12,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    statsStripGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 2,
    },
    statIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    statValue: {
        height: 16,
        width: "50%",
        borderRadius: 4,
    },
    statLabel: {
        height: 10,
        width: "80%",
        borderRadius: 3,
    },
    stickyBarContainer: {
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
        marginTop: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    searchBarWrapper: {
        height: 48,
        width: "100%",
        borderRadius: 14,
    },
    filterChipsRow: {
        flexDirection: "row",
        gap: 8,
    },
    filterChip: {
        width: 75,
        height: 32,
        borderRadius: 16,
    },
    categoriesTabRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    categoryTab: {
        width: 110,
        height: 34,
        borderRadius: 17,
    },
    menuContainer: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    categorySection: {
        marginTop: 20,
    },
    categoryHeaderAccordion: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.05)",
    },
    accordionTitle: {
        height: 18,
        width: 150,
        borderRadius: 4,
    },
    accordionChevron: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    menuItemCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.03)",
        gap: 14,
    },
    itemMetaLeft: {
        flex: 1,
        gap: 6,
    },
    vegTag: {
        width: 14,
        height: 14,
        borderRadius: 3,
    },
    dishName: {
        height: 16,
        width: "70%",
        borderRadius: 4,
    },
    dishPrice: {
        height: 14,
        width: "30%",
        borderRadius: 4,
    },
    dishDesc: {
        height: 12,
        width: "100%",
        borderRadius: 3,
        marginTop: 4,
    },
    itemImageRight: {
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    dishImage: {
        width: 96,
        height: 96,
        borderRadius: 14,
    },
    addBtn: {
        width: 76,
        height: 32,
        borderRadius: 10,
        position: "absolute",
        bottom: -8,
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.05)",
    },
});
