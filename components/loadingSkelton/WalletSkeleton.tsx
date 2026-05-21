import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Animated from "react-native-reanimated";
import { useShimmer } from "@/hooks/useShimmer";

// Single shimmer animation shared across all skeleton items
// Previously each SkeletonItem created its own animation (12+ concurrent animations)
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

export const WalletSkeleton = () => {
    const { Colors, isDark } = useTheme();
    // Single shimmer animation shared across all 12+ skeleton items
    const { pulseStyle } = useShimmer();

    return (
        <View style={styles.container}>
            {/* Balance Card Skeleton */}
            <View style={[styles.balanceCard, { backgroundColor: isDark ? Colors.surface : Colors.secondary }]}>
                <View style={styles.cardTop}>
                    <SkeletonItem style={styles.iconCircle} pulseStyle={pulseStyle} />
                    <SkeletonItem style={styles.labelLine} pulseStyle={pulseStyle} />
                </View>
                <SkeletonItem style={styles.amountLine} pulseStyle={pulseStyle} />
                <View style={styles.cardDivider} />
                <View style={styles.cardFooter}>
                    <SkeletonItem style={styles.footerLine} pulseStyle={pulseStyle} />
                    <SkeletonItem style={styles.chipLine} pulseStyle={pulseStyle} />
                </View>
            </View>

            {/* Stats Row Skeleton */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.statCard, { backgroundColor: Colors.surface }]}>
                        <SkeletonItem style={styles.statIcon} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.statLabel} pulseStyle={pulseStyle} />
                        <SkeletonItem style={styles.statValue} pulseStyle={pulseStyle} />
                    </View>
                ))}
            </View>

            {/* Transaction List Skeleton */}
            <View style={[styles.txCard, { backgroundColor: Colors.surface }]}>
                <View style={styles.txHeader}>
                    <SkeletonItem style={styles.txTitle} pulseStyle={pulseStyle} />
                </View>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.txRow}>
                        <SkeletonItem style={styles.txIcon} pulseStyle={pulseStyle} />
                        <View style={styles.txMeta}>
                            <SkeletonItem style={styles.txLabel} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.txDate} pulseStyle={pulseStyle} />
                        </View>
                        <View style={styles.txRight}>
                            <SkeletonItem style={styles.txAmount} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.txBadge} pulseStyle={pulseStyle} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    balanceCard: {
        borderRadius: 20,
        padding: 20,
        height: 180,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 11,
    },
    labelLine: {
        width: 120,
        height: 16,
        borderRadius: 4,
    },
    amountLine: {
        width: '70%',
        height: 48,
        borderRadius: 8,
        marginVertical: 10,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerLine: {
        width: 100,
        height: 12,
        borderRadius: 4,
    },
    chipLine: {
        width: 90,
        height: 32,
        borderRadius: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    statLabel: {
        width: '80%',
        height: 12,
        borderRadius: 4,
    },
    statValue: {
        width: '60%',
        height: 16,
        borderRadius: 4,
    },
    txCard: {
        borderRadius: 18,
        padding: 16,
        gap: 16,
    },
    txHeader: {
        marginBottom: 8,
    },
    txTitle: {
        width: 150,
        height: 20,
        borderRadius: 4,
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    txIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    txMeta: {
        flex: 1,
        gap: 6,
    },
    txLabel: {
        width: '70%',
        height: 16,
        borderRadius: 4,
    },
    txDate: {
        width: '40%',
        height: 12,
        borderRadius: 4,
    },
    txRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    txAmount: {
        width: 60,
        height: 16,
        borderRadius: 4,
    },
    txBadge: {
        width: 50,
        height: 14,
        borderRadius: 4,
    },
});
