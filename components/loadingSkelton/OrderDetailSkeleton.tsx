import React from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Animated from "react-native-reanimated";
import { useShimmer } from "@/hooks/useShimmer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

export default function OrderDetailSkeleton() {
    const { Colors, isDark } = useTheme();
    const { pulseStyle } = useShimmer();

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            {/* Map placeholder */}
            <View style={styles.mapPlaceholder}>
                <SkeletonItem style={StyleSheet.absoluteFill} pulseStyle={pulseStyle} />
                <View style={styles.backButtonPlaceholder}>
                    <SkeletonItem style={styles.circleBtn} pulseStyle={pulseStyle} />
                </View>
                <View style={styles.etaOverlayPlaceholder}>
                    <SkeletonItem style={styles.etaCard} pulseStyle={pulseStyle} />
                </View>
            </View>

            {/* Bottom Sheet Details Scroll */}
            <View style={[styles.detailsSheet, { backgroundColor: Colors.surface }]}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Status banner */}
                    <View style={styles.statusBanner}>
                        <SkeletonItem style={styles.statusIcon} pulseStyle={pulseStyle} />
                        <View style={styles.statusTexts}>
                            <SkeletonItem style={styles.statusTitle} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.statusSubtitle} pulseStyle={pulseStyle} />
                        </View>
                    </View>

                    {/* Progress bar placeholder */}
                    <View style={styles.progressRow}>
                        <SkeletonItem style={styles.progressBar} pulseStyle={pulseStyle} />
                    </View>

                    {/* Delivery Partner Section */}
                    <View style={[styles.sectionCard, { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                        <View style={styles.sectionHeader}>
                            <SkeletonItem style={styles.sectionIcon} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.sectionTitle} pulseStyle={pulseStyle} />
                        </View>
                        <View style={styles.driverRow}>
                            <SkeletonItem style={styles.driverAvatar} pulseStyle={pulseStyle} />
                            <View style={styles.driverTexts}>
                                <SkeletonItem style={styles.driverName} pulseStyle={pulseStyle} />
                                <SkeletonItem style={styles.driverPhone} pulseStyle={pulseStyle} />
                            </View>
                        </View>
                    </View>

                    {/* Order Items Section */}
                    <View style={[styles.sectionCard, { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                        <View style={styles.sectionHeader}>
                            <SkeletonItem style={styles.sectionIcon} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.sectionTitle} pulseStyle={pulseStyle} />
                        </View>
                        {[1, 2].map((i) => (
                            <View key={i} style={styles.itemRow}>
                                <SkeletonItem style={styles.itemIcon} pulseStyle={pulseStyle} />
                                <View style={styles.itemTexts}>
                                    <SkeletonItem style={styles.itemName} pulseStyle={pulseStyle} />
                                    <SkeletonItem style={styles.itemCustomization} pulseStyle={pulseStyle} />
                                </View>
                                <SkeletonItem style={styles.itemPrice} pulseStyle={pulseStyle} />
                            </View>
                        ))}
                    </View>

                    {/* Billing Summary Section */}
                    <View style={[styles.sectionCard, { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                        <View style={styles.sectionHeader}>
                            <SkeletonItem style={styles.sectionIcon} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.sectionTitle} pulseStyle={pulseStyle} />
                        </View>
                        <View style={styles.billRow}>
                            <SkeletonItem style={styles.billLabel} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.billValue} pulseStyle={pulseStyle} />
                        </View>
                        <View style={styles.billRow}>
                            <SkeletonItem style={styles.billLabel} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.billValue} pulseStyle={pulseStyle} />
                        </View>
                        <View style={styles.billRow}>
                            <SkeletonItem style={styles.billLabel} pulseStyle={pulseStyle} />
                            <SkeletonItem style={styles.billValue} pulseStyle={pulseStyle} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mapPlaceholder: {
        height: SCREEN_HEIGHT * 0.45,
        position: "relative",
    },
    backButtonPlaceholder: {
        position: "absolute",
        top: 48,
        left: 16,
    },
    circleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    etaOverlayPlaceholder: {
        position: "absolute",
        top: 48,
        right: 16,
    },
    etaCard: {
        width: 100,
        height: 60,
        borderRadius: 12,
    },
    detailsSheet: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    statusBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingBottom: 4,
    },
    statusIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    statusTexts: {
        flex: 1,
        gap: 6,
    },
    statusTitle: {
        height: 18,
        width: 140,
        borderRadius: 4,
    },
    statusSubtitle: {
        height: 12,
        width: 90,
        borderRadius: 3,
    },
    progressRow: {
        paddingVertical: 4,
    },
    progressBar: {
        height: 8,
        width: "100%",
        borderRadius: 4,
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.04)",
        paddingBottom: 8,
    },
    sectionIcon: {
        width: 18,
        height: 18,
        borderRadius: 4,
    },
    sectionTitle: {
        height: 14,
        width: 120,
        borderRadius: 3,
    },
    driverRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    driverTexts: {
        flex: 1,
        gap: 6,
    },
    driverName: {
        height: 14,
        width: 100,
        borderRadius: 3,
    },
    driverPhone: {
        height: 10,
        width: 70,
        borderRadius: 2,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    itemIcon: {
        width: 14,
        height: 14,
        borderRadius: 3,
    },
    itemTexts: {
        flex: 1,
        gap: 4,
    },
    itemName: {
        height: 12,
        width: "70%",
        borderRadius: 3,
    },
    itemCustomization: {
        height: 8,
        width: "40%",
        borderRadius: 2,
    },
    itemPrice: {
        height: 12,
        width: 40,
        borderRadius: 3,
    },
    billRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    billLabel: {
        height: 12,
        width: 80,
        borderRadius: 3,
    },
    billValue: {
        height: 12,
        width: 50,
        borderRadius: 3,
    },
});
