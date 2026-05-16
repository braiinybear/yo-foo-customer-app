import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { UserAddress } from "@/types/user";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Pressable,
    Dimensions,
    ActivityIndicator,
    Platform,
} from "react-native";
import { showAlert } from "@/store/useAlertStore";
import AddAddressScreen from "./AddAddressScreen";
import { useDeleteAddress, useSetDefaultAddress } from "@/hooks/useAddresses";

import { AnimatedBottomSheet } from "../AnimatedBottomSheet";
import { AnimatedPressable } from "../AnimatedPressable";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
    addresses: UserAddress[];
    selectedAddressId?: string;
    onSelectAddress: (address: UserAddress) => void;
}

export default function AddressModal({
    visible,
    onClose,
    addresses,
    selectedAddressId,
    onSelectAddress,
}: AddressModalProps) {
    const { Colors, isDark } = useTheme();
    const [openAdressAddform, setOpenAdressAddform] = useState<boolean>(false)
    const deleteMutation = useDeleteAddress();
    const setDefaultMutation = useSetDefaultAddress();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

    const handleDelete = (id: string) => {
        showAlert(
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

    const handleSetDefault = (address: UserAddress) => {
        if (address.isDefault) {
            onSelectAddress(address);
            onClose();
            return;
        }

        setDefaultMutation.mutate(address.id, {
            onSuccess: () => {
                onSelectAddress(address);
                onClose();
            }
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
        <AnimatedBottomSheet 
            visible={visible} 
            onClose={onClose} 
            height={Dimensions.get('window').height}
        >
                <View style={styles.sheetContainer}>
                    {openAdressAddform ? (
                        <>
                            <View style={styles.header}>
                                <AnimatedPressable onPress={() => setOpenAdressAddform(false)} scaleIn={0.8}>
                                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                                </AnimatedPressable>
                                <Text style={styles.title}>Add New Address</Text>
                                <View style={{ width: 40 }} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <AddAddressScreen setOpenAdressAddform={setOpenAdressAddform} />
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.header}>
                                <View style={{ width: 40 }} />
                                <Text style={styles.title}>Select Address</Text>
                                <AnimatedPressable onPress={onClose} scaleIn={0.8}>
                                    <Ionicons name="close" size={24} color={Colors.text} />
                                </AnimatedPressable>
                            </View>

                            <View style={{ flex: 1 }}>
                                <FlatList
                                    data={addresses}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={styles.listContent}
                                    renderItem={({ item, index }) => (
                                        <Animated.View entering={FadeInDown.delay(index * 50)}>
                                            <AnimatedPressable
                                                style={[
                                                    styles.addressItem,
                                                    selectedAddressId === item.id && styles.selectedItem,
                                                    setDefaultMutation.isPending && setDefaultMutation.variables === item.id && { opacity: 0.7 }
                                                ]}
                                                onPress={() => handleSetDefault(item)}
                                                disabled={setDefaultMutation.isPending}
                                                scaleIn={0.98}
                                            >
                                                <View style={styles.addressIcon}>
                                                    {setDefaultMutation.isPending && setDefaultMutation.variables === item.id ? (
                                                        <ActivityIndicator size="small" color={Colors.primary} />
                                                    ) : (
                                                        <Ionicons
                                                            name={item.type === "HOME" ? "home" : item.type === "WORK" ? "briefcase" : "location"}
                                                            size={20}
                                                            color={selectedAddressId === item.id ? Colors.primary : Colors.secondary}
                                                        />
                                                    )}
                                                </View>
                                                <View style={styles.addressInfo}>
                                                    <View style={styles.addressHeader}>
                                                        <Text style={styles.addressType}>{item.type}</Text>
                                                        {item.isDefault && (
                                                            <View style={styles.defaultBadge}>
                                                                <Text style={styles.defaultText}>Default</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.addressLine} numberOfLines={2}>{item.addressLine}</Text>
                                                </View>

                                                <View style={styles.actions}>
                                                    <AnimatedPressable
                                                        onPress={() => handleDelete(item.id)}
                                                        style={styles.actionButton}
                                                        disabled={deleteMutation.isPending || setDefaultMutation.isPending}
                                                        scaleIn={0.8}
                                                    >
                                                        {deleteMutation.isPending && deleteMutation.variables === item.id ? (
                                                            <ActivityIndicator size="small" color={Colors.danger} />
                                                        ) : (
                                                            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                                                        )}
                                                    </AnimatedPressable>
                                                    {selectedAddressId === item.id && (
                                                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} style={{ marginLeft: 8 }} />
                                                    )}
                                                </View>
                                            </AnimatedPressable>
                                        </Animated.View>
                                    )}
                                    ListFooterComponent={() => (
                                        <AnimatedPressable onPress={() => setOpenAdressAddform(true)} style={styles.addButton} scaleIn={0.98}>
                                            <View style={styles.addIcon}>
                                                <Ionicons name="add" size={24} color={Colors.primary} />
                                            </View>
                                            <Text style={styles.addButtonText}>Add New Address</Text>
                                        </AnimatedPressable>
                                    )}
                                />
                            </View>
                        </>
                    )}
                </View>
            </AnimatedBottomSheet>
        </Modal>

    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    sheetContainer: {
        flex: 1,
        paddingBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    addressItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    selectedItem: {
        borderColor: Colors.primary, // Gold border
        backgroundColor: Colors.primary + "08", 
    },
    addressIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    addressInfo: {
        flex: 1,
    },
    addressHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    addressType: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        textTransform: "capitalize",
    },
    defaultBadge: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    defaultText: {
        fontFamily: Fonts.brandBold,
        fontSize: 10,
        color: Colors.primary,
    },
    addressLine: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionButton: {
        padding: 8,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        marginTop: 8,
    },
    addIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    addButtonText: {
        flex: 1,
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary, // Gold
    },
});
