import { authClient } from "@/lib/auth-client";
import { useUser } from "@/hooks/useUser";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { uploadImageToCloudinary } from "@/utils/cloudinary";
import * as ImagePicker from "expo-image-picker";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    Switch,
    Share,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from "react-native";
import { showAlert } from "@/store/useAlertStore";
import { Fonts, FontSize } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

export default function ProfileScreen() {
    const { Colors, isDark, toggleTheme } = useTheme();
    const setSelectedVegType = useVegTypeStore(state => state.setSelectedVegType);
    const router = useRouter();
    const { data: user, isLoading, error } = useUser();
    const updateUser = useUpdateUser();
    
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

    // States for Editing
    const [isUploading, setIsUploading] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    
    // Calendar Navigation State
    const [calendarViewerDate, setCalendarViewerDate] = useState(new Date());
    const [isYearSelectorVisible, setIsYearSelectorVisible] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        gender: "",
        dob: "",
        isVeg: false
    });

    // Initialize form when user data loads
    useEffect(() => {
        if (user) {
            let formattedDob = "";
            if (user.dob) {
                const d = new Date(user.dob);
                const y = d.getUTCFullYear();
                const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
                const day = d.getUTCDate().toString().padStart(2, '0');
                formattedDob = `${y}-${m}-${day}`;
            }
            setEditForm({
                name: user.name || "",
                email: user.email || "",
                gender: user.gender || "",
                dob: formattedDob,
                isVeg: user.isVeg || false
            });
        }
    }, [user]);

    const handleSignOut = async () => {
        try {
            await authClient.signOut();
            router.replace("/(auth)/login");
        } catch (e) {
            console.error(e);
        }
    };

    const toggleVegMode = () => {
        const newValue = !editForm.isVeg;
        setEditForm({ ...editForm, isVeg: newValue });
        setSelectedVegType(newValue ? 'veg' : 'non-veg');
        updateUser.mutate({ isVeg: newValue });
    };

    const handleImagePicker = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert("Permission Denied", "We need camera roll permissions to change profile picture.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setIsUploading(true);
        try {
            const imageUrl = await uploadImageToCloudinary(uri);
            if (imageUrl) {
                updateUser.mutate({ image: imageUrl.secure_url }, {
                    onSuccess: () => showAlert("Success", "Profile picture updated!"),
                    onError: () => showAlert("Error", "Failed to update profile picture.")
                });
            }
        } catch (e) {
            showAlert("Error", "Image upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleShare = async () => {
        if (!user?.referralCode) return;
        try {
            await Share.share({
                message: `Hey! Order delicious food using my referral code: ${user.referralCode} and get rewards!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveProfile = () => {
        updateUser.mutate(editForm, {
            onSuccess: () => {
                setIsEditModalVisible(false);
                showAlert("Success", "Profile updated successfully!");
            },
            onError: () => showAlert("Error", "Failed to update profile.")
        });
    };

    if (isLoading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );

    if (!user) return (
        <View style={styles.loadingContainer}>
            <Text style={{ color: Colors.text }}>Please log in to view profile.</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Header */}
            <View style={styles.header}>
              
                <View style={styles.profileImageContainer}>
                    <Image 
                        source={{ uri: user.image || "https://ui-avatars.com/api/?name=" + user.name }} 
                        style={styles.profileImage} 
                    />
                    <TouchableOpacity style={styles.cameraIcon} onPress={handleImagePicker} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator size="small" color={isDark ? Colors.secondary : Colors.white} /> : <Ionicons name="camera" size={16} color={isDark ? Colors.secondary : Colors.white} />}
                    </TouchableOpacity>
                </View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userSubInfo}>{user.email || user.phoneNumber}</Text>
                
                <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditModalVisible(true)}>
                    <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            {/* Referral Card */}
            <View style={styles.referralCard}>
                <View style={styles.referralCardTop}>
                    <View style={styles.referralBadge}>
                        <MaterialCommunityIcons name="star" size={12} color={isDark ? Colors.secondary : Colors.white} />
                        <Text style={styles.referralBadgeText}>EXCLUSIVE REWARDS</Text>
                    </View>
                    <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}>
                        <Ionicons name="share-social" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.referralHeader}>Refer & Earn Rewards</Text>
                <Text style={styles.referralSubHeader}>Invite your friends to Yo-Foo and earn wallet credits on their first order!</Text>
                
                <View style={styles.referralActionRow}>
                    <View style={styles.referralCodeBox}>
                        <Text style={styles.referralCodeLabel}>YOUR CODE</Text>
                        <View style={styles.codeRow}>
                            <Text style={styles.referralCode}>{user.referralCode}</Text>
                            <TouchableOpacity onPress={handleShare} style={styles.copyIcon}>
                                <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.referralStats}>
                        <Text style={styles.statsCount}>{user.referralCount}</Text>
                        <Text style={styles.statsLabel}>REFERRALS</Text>
                    </View>
                </View>
            </View>

            {/* Personal Information Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <View style={styles.menuCard}>
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="person-outline" size={20} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuItemText}>Gender</Text>
                        </View>
                        <Text style={styles.menuValueText}>{user.gender || "Not specified"}</Text>
                    </View>
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
                                <Ionicons name="calendar-outline" size={20} color="#03A9F4" />
                            </View>
                            <Text style={styles.menuItemText}>Born on</Text>
                        </View>
                        <Text style={styles.menuValueText}>{user.dob ? new Date(user.dob).toLocaleDateString() : "Not specified"}</Text>
                    </View>
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
                            value={editForm.isVeg}
                            trackColor={{ false: '#D1D1D1', true: Colors.primary }}
                            thumbColor={'#FFF'}
                            onValueChange={toggleVegMode}
                        />
                    </View>
                    <View style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? Colors.surface : '#E0E0E0' }]}>
                                <Ionicons name="moon-outline" size={20} color={isDark ? Colors.primary : Colors.secondary} />
                            </View>
                            <Text style={styles.menuItemText}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            trackColor={{ false: '#D1D1D1', true: Colors.primary }}
                            thumbColor={'#FFF'}
                            onValueChange={toggleTheme}
                        />
                    </View>
                 
                </View>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>Version 1.0.0 (2026)</Text>
            <View style={{ height: 40 }} />

            {/* Edit Profile Modal */}
            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                    placeholder="Enter your name"
                                    placeholderTextColor={Colors.muted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <View style={[styles.textInput, styles.disabledInput]}>
                                    <Text style={{ color: Colors.muted }}>{editForm.email}</Text>
                                    <Ionicons name="lock-closed" size={14} color={Colors.muted} />
                                </View>
                                <Text style={styles.inputHelper}>Email cannot be changed</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Gender</Text>
                                <View style={styles.genderRow}>
                                    {["Male", "Female", "Other"].map((g) => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[
                                                styles.genderChip,
                                                editForm.gender === g && styles.genderChipSelected
                                            ]}
                                            onPress={() => setEditForm({ ...editForm, gender: g })}
                                        >
                                            <Text style={[
                                                styles.genderChipText,
                                                editForm.gender === g && styles.genderChipTextSelected
                                            ]}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Date of Birth</Text>
                                <TouchableOpacity
                                    style={styles.datePickerTrigger}
                                    onPress={() => setIsCalendarVisible(true)}
                                >
                                    <Text style={[styles.datePickerText, !editForm.dob && { color: Colors.muted }]}>
                                        {editForm.dob || "YYYY-MM-DD"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, updateUser.isPending && { opacity: 0.7 }]}
                                onPress={handleSaveProfile}
                                disabled={updateUser.isPending}
                            >
                                {updateUser.isPending ? (
                                    <ActivityIndicator color="#0D1B2A" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Simple Date Selector Modal (Custom Calendar) */}
            <Modal
                visible={isCalendarVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCalendarVisible(false)}
            >
                <View style={styles.calendarOverlay}>
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <Text style={styles.calendarTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setIsCalendarVisible(false)}>
                                <Ionicons name="close" size={20} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        
                        {/* 
                          Since we don't have a library, we'll use a simple manual year/month/day selector 
                          or a text input for better reliability in this scratchpad. 
                          Let's provide a clear instruction for the user to enter it.
                        */}
                        <View style={styles.calendarBody}>
                             <Text style={styles.calendarNote}>Please enter date in YYYY-MM-DD format</Text>
                             <TextInput
                                style={styles.calendarInput}
                                value={editForm.dob}
                                onChangeText={(text) => setEditForm({ ...editForm, dob: text })}
                                placeholder="1995-10-25"
                                placeholderTextColor={Colors.muted}
                                keyboardType="numeric"
                                maxLength={10}
                             />
                             <TouchableOpacity 
                                style={styles.calendarDoneBtn}
                                onPress={() => setIsCalendarVisible(false)}
                             >
                                <Text style={styles.calendarDoneBtnText}>Confirm</Text>
                             </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: "center",
        paddingVertical: 24,
        backgroundColor: Colors.surface,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 8,
    },
    screenTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xs,
        color: Colors.primary,
        letterSpacing: 3,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    profileImageContainer: {
        position: "relative",
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    cameraIcon: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    userName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: 4,
    },
    userSubInfo: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 16,
    },
    editProfileButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.primary + "15",
        borderWidth: 1,
        borderColor: Colors.primary + "30",
    },
    editProfileButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
    },
    // Referral Card
    referralCard: {
        margin: 16,
        padding: 20,
        borderRadius: 28,
        backgroundColor: isDark ? Colors.surface : Colors.secondary,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    referralCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    referralBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 50,
        gap: 6,
    },
    referralBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        color: "#0D1B2A",
        letterSpacing: 0.8,
    },
    shareIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    referralHeader: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.white,
        marginBottom: 6,
    },
    referralSubHeader: {
        fontFamily: Fonts.brand,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
        marginBottom: 20,
    },
    referralActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    referralCodeBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.primary + '50',
    },
    referralCodeLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.primary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    referralCode: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 2,
    },
    referralStats: {
        alignItems: 'center',
        paddingHorizontal: 16,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    statsCount: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.primary,
    },
    statsLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    copyIcon: {
        padding: 4,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
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
        borderBottomColor: Colors.border,
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
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
        gap: 10,
        padding: 18,
        borderRadius: 16,
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
        marginBottom: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: "60%",
        maxHeight: "90%",
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    modalScroll: {
        padding: 24,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    textInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 16,
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    disabledInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        opacity: 0.7,
    },
    inputHelper: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
        marginTop: 6,
        marginLeft: 4,
    },
    genderRow: {
        flexDirection: "row",
        gap: 12,
    },
    genderChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: "center",
    },
    genderChipSelected: {
        backgroundColor: Colors.primary + "15",
        borderColor: Colors.primary,
    },
    genderChipText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    genderChipTextSelected: {
        color: Colors.primary,
    },
    datePickerTrigger: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 16,
    },
    datePickerText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        marginTop: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: "#0D1B2A",
    },

    // Calendar Styles
    calendarOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    calendarCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        width: "100%",
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    calendarTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    calendarBody: {
        gap: 16,
    },
    calendarNote: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: "center",
    },
    calendarInput: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 16,
        textAlign: "center",
        fontSize: 20,
        fontFamily: Fonts.brandBlack,
        color: Colors.primary,
        borderWidth: 1,
        borderColor: Colors.primary + "30",
    },
    calendarDoneBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
    },
    calendarDoneBtnText: {
        fontFamily: Fonts.brandBold,
        color: "#0D1B2A",
    },
});
