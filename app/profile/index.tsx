import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useUser } from "@/hooks/useUser";
import { authClient } from "@/lib/auth-client";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    Switch
} from "react-native";

export default function ProfileScreen() {
    const router = useRouter();
    const { data: user, isLoading, error } = useUser();
    

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load profile.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.replace("/(auth)/login");
                    },
                },
            });
        } catch (error) {
            Alert.alert("Error", "Failed to sign out");
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Info */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.avatarContainer}>
                        {user.image ? (
                            <Image source={{ uri: user.image }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.avatarInitial}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.cameraIcon}>
                            <Ionicons name="camera" size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userSubInfo}>{user.email || user.phoneNumber}</Text>
                </View>

                {/* Referral Card */}
                <View style={styles.referralCard}>
                    <View style={styles.referralInfo}>
                        <View style={styles.referralBadge}>
                            <MaterialCommunityIcons name="gift" size={16} color={Colors.white} />
                            <Text style={styles.referralBadgeText}>REFER & EARN</Text>
                        </View>
                        <Text style={styles.referralHeader}>Share code, get rewards!</Text>
                        <View style={styles.referralCodeContainer}>
                            <Text style={styles.referralCode}>{user.referralCode}</Text>
                            <TouchableOpacity style={styles.copyIcon}>
                                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.referralStats}>
                        <Text style={styles.statsValue}>{user.referralCount}</Text>
                        <Text style={styles.statsLabel}>Referrals</Text>
                    </View>
                </View>

                {/* Preference Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                    <MaterialCommunityIcons name="leaf" size={20} color="#4CAF50" />
                                </View>
                                <Text style={styles.menuItemText}>Veg Mode Only</Text>
                            </View>
                            <Switch
                                value={user.isVeg}
                                trackColor={{ false: '#D1D1D1', true: '#4CAF50' }}
                                thumbColor={'#FFF'}
                                onValueChange={() => { }} // Handle preference update if needed
                            />
                        </View>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                                    <Ionicons name="language-outline" size={20} color="#2196F3" />
                                </View>
                                <Text style={styles.menuItemText}>App Language</Text>
                            </View>
                            <View style={styles.menuItemRight}>
                                <Text style={styles.menuValueText}>{user.language.toUpperCase()}</Text>
                                <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account settings</Text>
                    <View style={styles.menuCard}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/profile/address")}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="location-outline" size={20} color="#FF9800" />
                                </View>
                                <Text style={styles.menuItemText}>Saved Addresses</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                                    <Ionicons name="card-outline" size={20} color="#9C27B0" />
                                </View>
                                <Text style={styles.menuItemText}>Payments & Refunds</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
                                    <Ionicons name="notifications-outline" size={20} color="#009688" />
                                </View>
                                <Text style={styles.menuItemText}>Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.menuCard}>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#F5F5F5' }]}>
                                    <Ionicons name="help-circle-outline" size={20} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.menuItemText}>Help Center</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: '#F5F5F5' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.menuItemText}>Privacy Policy</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                    <Text style={styles.signOutText}>Sign Out from YoFoo</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0 (2026)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.danger,
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 8,
    },
    retryText: {
        fontFamily: Fonts.brandBold,
        color: Colors.white,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    editButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    editButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    profileHeaderCard: {
        alignItems: "center",
        paddingVertical: 24,
        backgroundColor: Colors.white,
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: Colors.primaryLight,
    },
    placeholderAvatar: {
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: {
        fontFamily: Fonts.brandBold,
        fontSize: 40,
        color: Colors.white,
    },
    cameraIcon: {
        position: "absolute",
        right: 0,
        bottom: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: Colors.white,
    },
    userName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xl,
        color: Colors.text,
        marginBottom: 4,
    },
    userSubInfo: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    referralCard: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    referralInfo: {
        flex: 1,
    },
    referralBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
        marginBottom: 8,
    },
    referralBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        color: Colors.white,
    },
    referralHeader: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 4,
    },
    referralCodeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    referralCode: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.primary,
        letterSpacing: 1,
    },
    copyIcon: {
        padding: 4,
    },
    referralStats: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderLeftColor: Colors.border,
        paddingLeft: 16,
    },
    statsValue: {
        fontFamily: Fonts.brandBold,
        fontSize: 24,
        color: Colors.text,
    },
    statsLabel: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
    },
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    menuCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    menuItemText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    menuItemRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    menuValueText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },
    signOutButton: {
        margin: 16,
        marginTop: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: Colors.danger + "10",
        borderWidth: 1,
        borderColor: Colors.danger + "20",
    },
    signOutText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.danger,
    },
    versionText: {
        textAlign: "center",
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 8,
    },
});
