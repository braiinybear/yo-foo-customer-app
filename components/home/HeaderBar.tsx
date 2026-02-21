import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { UserAddress } from "@/types/user";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface HeaderBarProps {
    address?: UserAddress[];
    subAddress: string;
    userInitial: string;
    onAddressPress?: () => void;
    onWalletPress?: () => void;
    onProfilePress?: () => void;
}

export default function HeaderBar({
    address,
    subAddress,
    userInitial,
    onAddressPress,
    onWalletPress,
    onProfilePress,
}: HeaderBarProps) {
    const displayAddress = address && address.length > 0
        ? address[0].addressLine
        : "Select Address";

    return (
        <View style={styles.container}>
            {/* Address */}
            <TouchableOpacity style={styles.addressSection} onPress={onAddressPress} activeOpacity={0.7}>
                <View style={styles.addressRow}>
                    <Ionicons name="location-sharp" size={16} color={Colors.primary} />
                    <Text style={styles.addressName} numberOfLines={1}>{displayAddress}</Text>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color={Colors.text} />
                </View>
                <Text style={styles.subAddress} numberOfLines={1}>{subAddress}</Text>
            </TouchableOpacity>

            {/* Right icons */}
            <View style={styles.iconsRow}>
                {/* Wallet */}
                <TouchableOpacity style={styles.iconButton} onPress={onWalletPress} activeOpacity={0.7}>
                    <Ionicons name="wallet-outline" size={22} color={Colors.text} />
                </TouchableOpacity>

                {/* Profile avatar */}
                <TouchableOpacity style={styles.avatar} onPress={onProfilePress} activeOpacity={0.7}>
                    <Text style={styles.avatarText}>{userInitial}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,

    },
    addressSection: {
        flex: 1,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    addressName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    subAddress: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
        marginLeft: 20,
    },
    iconsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.light,
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
});
