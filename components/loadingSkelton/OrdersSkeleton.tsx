import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Animated from "react-native-reanimated";
import { useShimmer } from "@/hooks/useShimmer";

const SkeletonItem = ({ style, pulseStyle }: { style: any; pulseStyle: any }) => {
    const { Colors } = useTheme();
    return (
        <Animated.View
            style={[
                style,
                { backgroundColor: Colors.border },
                pulseStyle
            ]}
        />
    );
};

export default function OrdersSkeleton() {
    const { Colors } = useTheme();
    const { pulseStyle } = useShimmer();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} showsVerticalScrollIndicator={false}>
            {/* Header skeleton */}
            <View style={styles.header}>
                <SkeletonItem style={styles.headerTitle} pulseStyle={pulseStyle} />
            </View>

            {/* Active order card skeleton */}
            <View style={[styles.activeCard, { backgroundColor: Colors.surface }]}>
                <View style={styles.cardHeader}>
                    <SkeletonItem style={styles.restaurantLogo} pulseStyle={pulseStyle} />
                    <View style={styles.headerText}>
                        <SkeletonItem style={styles.restaurantName} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.orderMeta} pulseStyle={pulseStyle} />
                    </View>
                    <SkeletonItem style={styles.statusBadge} pulseStyle={pulseStyle} />
                </View>
                <View style={styles.divider} />
                <View style={styles.progressBarContainer}>
                    <SkeletonItem style={styles.progressLabel} pulseStyle={pulseStyle} />
                    <SkeletonItem style={styles.progressBar} pulseStyle={pulseStyle} />
                </View>
            </View>

            {/* Past orders list skeleton */}
            <View style={styles.sectionHeader}>
                <SkeletonItem style={styles.sectionTitle} pulseStyle={pulseStyle} />
            </View>

            {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.orderCard, { backgroundColor: Colors.surface }]}>
                    <View style={styles.cardHeader}>
                        <SkeletonItem style={styles.restaurantLogo} pulseStyle={pulseStyle} />
                        <View style={styles.headerText}>
                            <SkeletonItem style={styles.restaurantName} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.orderMeta} pulseStyle={pulseStyle} />
                        </View>
                        <SkeletonItem style={styles.statusBadgeSmall} pulseStyle={pulseStyle} />
                    </View>
                    
                    <View style={styles.itemsContainer}>
                        <SkeletonItem style={styles.itemLine} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.itemLineShort} pulseStyle={pulseStyle} />
                    </View>

                    <View style={styles.divider} />
                    
                    <View style={styles.cardFooter}>
                        <SkeletonItem style={styles.footerText} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.priceText} pulseStyle={pulseStyle} />
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        height: 24,
        width: 140,
        borderRadius: 6,
    },
    activeCard: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    restaurantLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    headerText: {
        flex: 1,
        gap: 6,
    },
    restaurantName: {
        height: 16,
        width: 120,
        borderRadius: 4,
    },
    orderMeta: {
        height: 12,
        width: 80,
        borderRadius: 3,
    },
    statusBadge: {
        height: 24,
        width: 80,
        borderRadius: 6,
    },
    statusBadgeSmall: {
        height: 20,
        width: 70,
        borderRadius: 5,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.06)",
        marginVertical: 14,
    },
    progressBarContainer: {
        gap: 10,
    },
    progressLabel: {
        height: 12,
        width: 150,
        borderRadius: 3,
    },
    progressBar: {
        height: 6,
        width: "100%",
        borderRadius: 3,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
    },
    sectionTitle: {
        height: 18,
        width: 110,
        borderRadius: 4,
    },
    orderCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    itemsContainer: {
        paddingLeft: 60,
        gap: 6,
        marginVertical: 4,
    },
    itemLine: {
        height: 12,
        width: "80%",
        borderRadius: 3,
    },
    itemLineShort: {
        height: 12,
        width: "50%",
        borderRadius: 3,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: 60,
    },
    footerText: {
        height: 12,
        width: 60,
        borderRadius: 3,
    },
    priceText: {
        height: 14,
        width: 50,
        borderRadius: 4,
    },
});
