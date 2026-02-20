import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    if (isPending) {
        return (
            <View style={styles.center}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                    </Text>
                </View>
                <Text style={styles.name}>{session.user.name}</Text>
                <Text style={styles.email}>{session.user.email}</Text>
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { }}>
                    <Ionicons name="location-outline" size={24} color={Colors.text} />
                    <Text onPress={() => router.push("/profile/address")} style={styles.menuText}>Saved Addresses</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { }}>
                    <Ionicons name="card-outline" size={24} color={Colors.text} />
                    <Text style={styles.menuText}>Payment Methods</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => { }}>
                    <Ionicons name="help-circle-outline" size={24} color={Colors.text} />
                    <Text style={styles.menuText}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.muted} />
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
                <Text style={styles.version}>Version 1.0.0</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        alignItems: "center",
        paddingVertical: 30,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
        backgroundColor: Colors.surface,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        fontFamily: Fonts.brandBold,
        fontSize: 32,
        color: Colors.white,
    },
    name: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xl,
        color: Colors.text,
        marginBottom: 4,
    },
    email: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    content: {
        padding: 16,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    menuText: {
        flex: 1,
        marginLeft: 16,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    footer: {
        padding: 16,
        marginTop: "auto",
        marginBottom: 20
    },
    signOutButton: {
        backgroundColor: Colors.light,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 16,
    },
    signOutText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.danger,
    },
    version: {
        textAlign: "center",
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
});
