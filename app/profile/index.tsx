import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useUser } from "@/hooks/useUser";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { authClient } from "@/lib/auth-client";
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

export default function ProfileScreen() {
    const setSelectedVegType = useVegTypeStore(state => state.setSelectedVegType);
    const router = useRouter();
    const { data: user, isLoading, error } = useUser();
    const updateUser = useUpdateUser();
    
    // States for Editing
    const [isUploading, setIsUploading] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    
    // Calendar Navigation State
    const [calendarViewerDate, setCalendarViewerDate] = useState(new Date());
    const [isYearSelectorVisible, setIsYearSelectorVisible] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "",
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
                gender: user.gender || "",
                dob: formattedDob,
                isVeg: user.isVeg || false
            });
            // Sync store on load
            setSelectedVegType(user.isVeg ? "veg" : "non-veg");
            
            if (user.dob) {
                setCalendarViewerDate(new Date(user.dob));
            }
        }
    }, [user]);

    // ── Calendar Helpers ─────────────────────────────────────
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = calendarViewerDate.getFullYear();
        const month = calendarViewerDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push({ day: "", type: 'padding' });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, type: 'day' });
        }
        return days;
    }, [calendarViewerDate]);

    const changeMonth = (delta: number) => {
        setCalendarViewerDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const handleSelectYear = (year: number) => {
        setCalendarViewerDate(prev => new Date(year, prev.getMonth(), 1));
        setIsYearSelectorVisible(false);
    };

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

    const handleDateSelect = (day: number) => {
        const year = calendarViewerDate.getFullYear();
        const month = (calendarViewerDate.getMonth() + 1).toString().padStart(2, '0');
        const formattedDay = day.toString().padStart(2, '0');
        const dateString = `${year}-${month}-${formattedDay}`;
        
        setEditForm(prev => ({ ...prev, dob: dateString }));
        setIsCalendarVisible(false);
    };

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
            showAlert("Error", "Failed to sign out");
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Denied', 'We need access to your gallery to upload a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadProfileImage(result.assets[0].uri);
        }
    };

    const uploadProfileImage = async (uri: string) => {
        setIsUploading(true);
        try {
            const response = await uploadImageToCloudinary(uri, "user_profiles");
            await updateUser.mutateAsync({ image: response.secure_url });
        } catch (error: any) {
            showAlert("Upload Error", error.message || "Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };


    const handleSaveProfile = async () => {
        try {
            await updateUser.mutateAsync({
                name: editForm.name,
                gender: editForm.gender,
                dob: editForm.dob,
                isVeg: editForm.isVeg
            });
            // Sync with VegTypeStore
            setSelectedVegType(editForm.isVeg ? "veg" : "non-veg");
            
            setIsEditModalVisible(false);
            showAlert("Success", "Profile updated successfully");
        } catch (error: any) {
            showAlert("Error", error.message || "Failed to update profile");
        }
    };

    const toggleVegMode = async (value: boolean) => {
        try {
            setEditForm(prev => ({ ...prev, isVeg: value }));
            await updateUser.mutateAsync({ isVeg: value });
            // Sync with VegTypeStore
            setSelectedVegType(value ? "veg" : "non-veg");
        } catch (error) {
            setEditForm(prev => ({ ...prev, isVeg: !value }));
            showAlert("Error", "Failed to update preference");
        }
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Hey! Use my referral code ${user.referralCode} to get amazing discounts on your first order with Yo-Foo! Download now: https://yofoo.app/download`,
                title: 'Refer & Earn',
            });
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    // shared with activity type of result.activityType
                } else {
                    // shared
                }
            } else if (result.action === Share.dismissedAction) {
                // dismissed
            }
        } catch (error) {
            showAlert('Error', 'Could not share referral code');
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Info */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.avatarContainer}>
                        {isUploading ? (
                            <View style={[styles.avatar, styles.loadingAvatar]}>
                                <ActivityIndicator color={Colors.white} />
                            </View>
                        ) : user.image ? (
                            <Image source={{ uri: user.image }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.avatarInitial}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity 
                            style={styles.cameraIcon} 
                            onPress={handlePickImage}
                            disabled={isUploading}
                        >
                            <Ionicons name="camera" size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userSubInfo}>{user.email || user.phoneNumber}</Text>
                    
                    <TouchableOpacity 
                        style={styles.editProfileButton} 
                        onPress={() => setIsEditModalVisible(true)}
                    >
                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Referral Card */}
                <View style={styles.referralCard}>
                    <View style={styles.referralInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View style={styles.referralBadge}>
                                <MaterialCommunityIcons name="gift" size={16} color={Colors.white} />
                                <Text style={styles.referralBadgeText}>REFER & EARN</Text>
                            </View>
                            <Text style={[styles.statsValue, { fontSize: 14 }]}>
                                {user.referralCount} <Text style={{ fontSize: 10, color: Colors.muted }}>Successful</Text>
                            </Text>
                        </View>
                        <Text style={styles.referralHeader}>Share code, get rewards!</Text>
                        <View style={styles.referralCodeContainer}>
                            <Text style={styles.referralCode}>{user.referralCode}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <Ionicons name="share-social" size={20} color={Colors.white} />
                        <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
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
                            <Text style={styles.menuValueText}>
                                {user.dob ? new Date(user.dob).toLocaleDateString() : "Not specified"}
                            </Text>
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
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0 (2026)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>

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
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                                    placeholder="Enter your name"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Gender</Text>
                                <View style={styles.genderRow}>
                                    {['Male', 'Female', 'Other'].map((g) => (
                                        <TouchableOpacity 
                                            key={g}
                                            style={[
                                                styles.genderOption, 
                                                editForm.gender === g && styles.genderOptionSelected
                                            ]}
                                            onPress={() => setEditForm(prev => ({ ...prev, gender: g }))}
                                        >
                                            <Text style={[
                                                styles.genderOptionText,
                                                editForm.gender === g && styles.genderOptionTextSelected
                                            ]}>
                                                {g}
                                            </Text>
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
                                    <Text style={[styles.dateText, !editForm.dob && { color: Colors.muted }]}>
                                        {editForm.dob ? new Date(editForm.dob).toLocaleDateString() : "Select Date"}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                <View>
                                    <Text style={styles.inputLabel}>Veg Mode</Text>
                                    <Text style={styles.inputSubLabel}>Prefer vegetarian food only</Text>
                                </View>
                                <Switch
                                    value={editForm.isVeg}
                                    onValueChange={(val) => setEditForm(prev => ({ ...prev, isVeg: val }))}
                                    trackColor={{ false: '#D1D1D1', true: Colors.primary }}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.saveButton, updateUser.isPending && styles.buttonDisabled]} 
                                onPress={handleSaveProfile}
                                disabled={updateUser.isPending}
                            >
                                {updateUser.isPending ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Calendar Picker Modal */}
            <Modal
                visible={isCalendarVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCalendarVisible(false)}
            >
                <View style={styles.calendarOverlay}>
                    <View style={styles.calendarContent}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={() => changeMonth(-1)}>
                                <Ionicons name="chevron-back" size={24} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsYearSelectorVisible(!isYearSelectorVisible)}>
                                <Text style={styles.calendarMonthYear}>
                                    {months[calendarViewerDate.getMonth()]} {calendarViewerDate.getFullYear()} <Ionicons name={isYearSelectorVisible ? "chevron-up" : "chevron-down"} size={14} color={Colors.primary} />
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => changeMonth(1)}>
                                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {isYearSelectorVisible ? (
                            <View style={{ height: 300 }}>
                                <FlatList
                                    data={Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i)}
                                    keyExtractor={(item) => item.toString()}
                                    numColumns={4}
                                    contentContainerStyle={{ padding: 10 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity 
                                            style={[
                                                styles.yearOption,
                                                calendarViewerDate.getFullYear() === item && styles.yearOptionSelected
                                            ]}
                                            onPress={() => handleSelectYear(item)}
                                        >
                                            <Text style={[
                                                styles.yearOptionText,
                                                calendarViewerDate.getFullYear() === item && styles.yearOptionTextSelected
                                            ]}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        ) : (
                            <>
                                <View style={styles.calendarWeekDays}>
                                    {weekDays.map(day => (
                                        <Text key={day} style={styles.calendarWeekDayText}>{day}</Text>
                                    ))}
                                </View>

                                <FlatList
                                    data={calendarData}
                                    numColumns={7}
                                    keyExtractor={(_, index) => index.toString()}
                                    contentContainerStyle={{ paddingHorizontal: 10 }}
                                    renderItem={({ item }) => {
                                        const isSelected = typeof item.day === 'number' && 
                                            editForm.dob && 
                                            item.day === new Date(editForm.dob).getDate() && 
                                            calendarViewerDate.getMonth() === new Date(editForm.dob).getMonth() &&
                                            calendarViewerDate.getFullYear() === new Date(editForm.dob).getFullYear();

                                        return (
                                            <TouchableOpacity 
                                                style={[
                                                    styles.calendarDay,
                                                    item.type === 'padding' && { opacity: 0 },
                                                    isSelected && styles.calendarDaySelected
                                                ]}
                                                disabled={item.type === 'padding' || typeof item.day !== 'number'}
                                                onPress={() => typeof item.day === 'number' && handleDateSelect(item.day)}
                                            >
                                                <Text style={[
                                                    styles.calendarDayText,
                                                    isSelected && styles.calendarDayTextSelected
                                                ]}>
                                                    {item.day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.calendarCloseButton}
                            onPress={() => setIsCalendarVisible(false)}
                        >
                            <Text style={styles.calendarCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    loadingAvatar: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 12,
    },
    editProfileButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    editProfileButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
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
        marginTop: 4,
    },
    referralCode: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.primary,
        letterSpacing: 1,
    },
    statsValue: {
        fontFamily: Fonts.brandBold,
        fontSize: 24,
        color: Colors.text,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    shareButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.white,
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

    // ── Modal Styles ──────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: "90%",
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    modalTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    modalBody: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 8,
    },
    inputSubLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    textInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.text,
        backgroundColor: Colors.surface,
    },
    genderRow: {
        flexDirection: "row",
        gap: 12,
    },
    genderOption: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: "center",
        backgroundColor: Colors.surface,
    },
    genderOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    genderOptionText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    genderOptionTextSelected: {
        color: Colors.primary,
    },
    modalFooter: {
        padding: 24,
        paddingTop: 0,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    // ── Calendar Specific Styles ──────────────────────────────
    datePickerTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: Colors.surface,
    },
    dateText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    calendarOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    calendarContent: {
        width: "100%",
        backgroundColor: Colors.white,
        borderRadius: 24,
        paddingBottom: 20,
        overflow: "hidden",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    calendarHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        backgroundColor: Colors.surface,
    },
    calendarMonthYear: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    calendarWeekDays: {
        flexDirection: "row",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    calendarWeekDayText: {
        flex: 1,
        textAlign: "center",
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.muted,
    },
    calendarDay: {
        flex: 1,
        height: 45,
        justifyContent: "center",
        alignItems: "center",
        margin: 2,
        borderRadius: 10,
    },
    calendarDaySelected: {
        backgroundColor: Colors.primary,
    },
    calendarDayText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    calendarDayTextSelected: {
        color: Colors.white,
        fontFamily: Fonts.brandBold,
    },
    calendarCloseButton: {
        alignSelf: "center",
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    calendarCloseButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    yearOption: {
        flex: 1,
        paddingVertical: 12,
        margin: 4,
        alignItems: "center",
        borderRadius: 8,
        backgroundColor: Colors.surface,
    },
    yearOptionSelected: {
        backgroundColor: Colors.primary,
    },
    yearOptionText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    yearOptionTextSelected: {
        color: Colors.white,
        fontFamily: Fonts.brandBold,
    },
});
