import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useAddresses, useDeleteAddress, useSetDefaultAddress } from "@/hooks/useAddresses";
import { UserAddress } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddAddressScreen from "@/components/home/AddAddressScreen";

export default function AddressesScreen() {
    const router = useRouter();
    const { data: addresses, isLoading, error } = useAddresses();
    const deleteMutation = useDeleteAddress();
    const setDefaultMutation = useSetDefaultAddress();
    
    const [isAddMode, setIsAddMode] = useState(false);

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Address",
            "Are you sure you want to delete this address?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate(id)
                }
            ]
        );
    };

    const handleSetDefault = (id: string) => {
        setDefaultMutation.mutate(id);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (isAddMode) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setIsAddMode(false)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add New Address</Text>
                    <View style={{ width: 40 }} />
                </View>
                <AddAddressScreen setOpenAdressAddform={setIsAddMode} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Saved Addresses</Text>
                <TouchableOpacity onPress={() => setIsAddMode(true)} style={styles.addButtonIcon}>
                    <Ionicons name="add" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={addresses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="location-outline" size={64} color={Colors.muted} />
                        <Text style={styles.emptyTitle}>No Addresses Saved</Text>
                        <Text style={styles.emptySubtitle}>Add an address to get started with your orders.</Text>
                        <TouchableOpacity style={styles.primaryAddButton} onPress={() => setIsAddMode(true)}>
                            <Text style={styles.primaryAddButtonText}>Add New Address</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.addressCard, item.isDefault && styles.defaultCard]}>
                        <View style={styles.addressInfo}>
                            <View style={styles.typeRow}>
                                <View style={[styles.iconBox, { backgroundColor: item.type === 'HOME' ? '#E3F2FD' : item.type === 'WORK' ? '#F3E5F5' : '#E8F5E9' }]}>
                                    <Ionicons 
                                        name={item.type === 'HOME' ? 'home' : item.type === 'WORK' ? 'briefcase' : 'location'} 
                                        size={18} 
                                        color={item.type === 'HOME' ? '#2196F3' : item.type === 'WORK' ? '#9C27B0' : '#4CAF50'} 
                                    />
                                </View>
                                <Text style={styles.addressType}>{item.type}</Text>
                                {item.isDefault && (
                                    <View style={styles.defaultBadge}>
                                        <Text style={styles.defaultBadgeText}>Default</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.addressLine} numberOfLines={2}>{item.addressLine}</Text>
                        </View>
                        
                        <View style={styles.actions}>
                            {!item.isDefault && (
                                <TouchableOpacity 
                                    style={styles.actionIcon} 
                                    onPress={() => handleSetDefault(item.id)}
                                    disabled={setDefaultMutation.isPending}
                                >
                                    {setDefaultMutation.isPending && setDefaultMutation.variables === item.id ? (
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    ) : (
                                        <Ionicons name="checkmark-circle-outline" size={22} color={Colors.muted} />
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={styles.actionIcon} 
                                onPress={() => handleDelete(item.id)}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending && deleteMutation.variables === item.id ? (
                                    <ActivityIndicator size="small" color={Colors.danger} />
                                ) : (
                                    <Ionicons name="trash-outline" size={22} color={Colors.danger} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListFooterComponent={
                    addresses && addresses.length > 0 ? (
                        <TouchableOpacity style={styles.bottomAddButton} onPress={() => setIsAddMode(true)}>
                            <Ionicons name="add-circle" size={20} color={Colors.primary} />
                            <Text style={styles.bottomAddButtonText}>Add Another Address</Text>
                        </TouchableOpacity>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    addButtonIcon: {
        padding: 4,
    },
    listContainer: {
        padding: 16,
        flexGrow: 1,
    },
    addressCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        // Elevation for android
        elevation: 2,
        // Shadow for ios
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    defaultCard: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight + "30",
    },
    addressInfo: {
        flex: 1,
    },
    typeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    addressType: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        textTransform: "capitalize",
    },
    defaultBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    defaultBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        color: Colors.white,
    },
    addressLine: {
        fontFamily: Fonts.brand,
        fontSize: 13,
        color: Colors.muted,
        lineHeight: 18,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginLeft: 12,
    },
    actionIcon: {
        padding: 4,
    },
    bottomAddButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 8,
        marginTop: 8,
    },
    bottomAddButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: "center",
        marginBottom: 24,
    },
    primaryAddButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    primaryAddButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
});