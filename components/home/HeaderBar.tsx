import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { UserAddress } from "@/types/user";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface HeaderBarProps {
    address?: UserAddress[];
    subAddress: string;
    userInitial: string;
    userImage?: string | null;
    onAddressPress?: () => void;
    onWalletPress?: () => void;
    onProfilePress?: () => void;
}

export default function HeaderBar({
    address,
    subAddress,
    userInitial,
    userImage,
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
            <TouchableOpacity style={styles.addressSection} onPress={onAddressPress} activeOpacity={0.8}>
                <View style={styles.addressRow}>
                    <View style={styles.locationDot}>
                        <Ionicons name="location-sharp" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.addressName} numberOfLines={1}>{displayAddress.slice(0, 28) + '...'}</Text>
                    <MaterialIcons name="keyboard-arrow-down" size={22} color={Colors.muted} />
                </View>
                <Text style={styles.subAddress} numberOfLines={1}>{subAddress}</Text>
            </TouchableOpacity>

            {/* Right icons */}
            <View style={styles.iconsRow}>
                {/* Wallet */}
                <TouchableOpacity style={styles.iconButton} onPress={onWalletPress} activeOpacity={0.8}>
                    <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>

                {/* Profile avatar */}
                <TouchableOpacity style={styles.avatar} onPress={onProfilePress} activeOpacity={0.8}>
                    {userImage ? (
                        <Image source={{ uri: userImage }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>{userInitial}</Text>
                    )}
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
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    addressSection: {
        flex: 1,
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    locationDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary + "12",
        alignItems: "center",
        justifyContent: "center",
    },
    addressName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        flex: 1,
    },
    subAddress: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 3,
        marginLeft: 30,
    },
    iconsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
    },
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.white,
    },
    badgeText: {
        color: Colors.white,
        fontSize: 10,
        fontFamily: Fonts.brandBold,
    },
});
