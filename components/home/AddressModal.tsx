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
} from "react-native";
import AddAddressScreen from "./AddAddressScreen";

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
    addresses: UserAddress[];
    selectedAddressId?: string;
    onSelectAddress: (address: UserAddress) => void;

}

const { height } = Dimensions.get("window");

export default function AddressModal({
    visible,
    onClose,
    addresses,
    selectedAddressId,
    onSelectAddress,
}: AddressModalProps) {
    const [openAdressAddform, setOpenAdressAddform] = useState<boolean>(false)
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
                                        selectedAddressId === item.id && styles.selectedItem
                                    ]}
                                    onPress={() => {
                                        onSelectAddress(item);
                                        onClose();
                                    }}
                                >
                                    <View style={styles.addressIcon}>
                                        <Ionicons
                                            name={item.type === "HOME" ? "home" : item.type === "WORK" ? "briefcase" : "location"}
                                            size={20}
                                            color={selectedAddressId === item.id ? Colors.primary : Colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.addressInfo}>
                                        <Text style={styles.addressType}>{item.type}</Text>
                                        <Text style={styles.addressLine} numberOfLines={2}>{item.addressLine}</Text>
                                    </View>
                                    {selectedAddressId === item.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                    )}
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
        backgroundColor: Colors.primary + "08", // Very light primary
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
    addressType: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        textTransform: "capitalize",
    },
    addressLine: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
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
