import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { UserAddress } from "@/types/user";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Pressable,
    Dimensions,
    Platform,
    Alert,
    ActivityIndicator,
} from "react-native";
import AddAddressScreen from "./AddAddressScreen";
import { useDeleteAddress, useSetDefaultAddress } from "@/hooks/useAddresses";

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
    const [openAdressAddform, setOpenAdressAddform] = useState<boolean>(false)
    const deleteMutation = useDeleteAddress();
    const setDefaultMutation = useSetDefaultAddress();

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
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.fullScreenContainer}>
                {openAdressAddform ? (
                    <>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setOpenAdressAddform(false)}>
                                <Ionicons name="arrow-back" size={24} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.title}>Add New Address</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <AddAddressScreen setOpenAdressAddform={setOpenAdressAddform} />
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>Select Address</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={addresses}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.addressItem,
                                        selectedAddressId === item.id && styles.selectedItem,
                                        setDefaultMutation.isPending && setDefaultMutation.variables === item.id && { opacity: 0.7 }
                                    ]}
                                    onPress={() => handleSetDefault(item)}
                                    disabled={setDefaultMutation.isPending}
                                >
                                    <View style={styles.addressIcon}>
                                        {setDefaultMutation.isPending && setDefaultMutation.variables === item.id ? (
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        ) : (
                                            <Ionicons
                                                name={item.type === "HOME" ? "home" : item.type === "WORK" ? "briefcase" : "location"}
                                                size={20}
                                                color={selectedAddressId === item.id ? Colors.primary : Colors.textSecondary}
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
                                        <TouchableOpacity
                                            onPress={() => handleDelete(item.id)}
                                            style={styles.actionButton}
                                            disabled={deleteMutation.isPending || setDefaultMutation.isPending}
                                        >
                                            {deleteMutation.isPending && deleteMutation.variables === item.id ? (
                                                <ActivityIndicator size="small" color={Colors.danger} />
                                            ) : (
                                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                                            )}
                                        </TouchableOpacity>
                                        {selectedAddressId === item.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} style={{ marginLeft: 8 }} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListFooterComponent={() => (
                                <TouchableOpacity onPress={() => setOpenAdressAddform(true)} style={styles.addButton} >
                                    <View style={styles.addIcon}>
                                        <Ionicons name="add" size={24} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.addButtonText}>Add New Address</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'ios' ? 50 : 20, // To handle status bar
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
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
    },
    addressItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    selectedItem: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "08",
    },
    addressIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
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
        color: Colors.textSecondary,
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
        borderRadius: 20,
        backgroundColor: Colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    addButtonText: {
        flex: 1,
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
    },
});
