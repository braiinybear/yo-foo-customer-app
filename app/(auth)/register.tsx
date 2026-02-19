import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";


export default function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsLoading(true);

        const result = await authClient.signUp.email(
            { name, email, password },
            {
                onSuccess: (ctx: any) => {
                    console.log("[Register] onSuccess ctx:", JSON.stringify(ctx));
                    setIsLoading(false);
                    Alert.alert("Registration Successful", "Account created successfully");
                    router.replace("/")
                },
                onError: (ctx: any) => {
                    console.log("[Register] onError ctx:", JSON.stringify(ctx));
                    setIsLoading(false);
                    Alert.alert("Registration Failed", ctx.error.message);
                },
            }
        );
        console.log("[Register] signUp result:", JSON.stringify(result));
    };

    const handleGoogleRegister = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "food-delivery-customer:///",
            });
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <Image
                source={require("@/assets/images/app-logo.png")}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>

            <View style={styles.form}>
                <TextInput
                    placeholderTextColor="#888"
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />

                <TextInput
                    placeholderTextColor="#888"
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                />

                <TextInput
                    placeholderTextColor="#888"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.buttonText}>Creating...</Text>
                        </>
                    ) : (
                        <Text style={styles.buttonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
                </View>

                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleRegister}
                    disabled={isLoading}
                >
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push("/(auth)/login")}
                    style={styles.switchContainer}
                >
                    <Text style={styles.switchText}>
                        Already have an account? Sign In
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    logo: {
        width: 220,
        height: 220,
        alignSelf: "center",
        marginBottom: 8,
    },
    title: {
        fontSize: FontSize.xxl,
        fontFamily: Fonts.brandBold,
        marginBottom: 32,
        textAlign: "center",
        color: "#3b1f0e",
    },
    form: { width: "100%" },
    input: {
        borderWidth: 1,
        borderColor: "#c9b8ae",
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        backgroundColor: "#fff",
        color: "#1a1a1a",
    },
    button: {
        backgroundColor: "#0d8def",
        padding: 18,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 8,
    },
    buttonDisabled: { backgroundColor: "#a07050" },
    buttonText: {
        color: "#fff",
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    divider: { flex: 1, height: 1, backgroundColor: "#c9b8ae" },
    dividerText: {
        marginHorizontal: 16,
        color: "#5a2d0c",
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: "#dadce0",
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    googleButtonText: {
        color: "#3c4043",
        fontSize: FontSize.md,
        fontFamily: Fonts.brandMedium,
    },
    switchContainer: { marginTop: 24, alignItems: "center" },
    switchText: {
        color: "#3b1f0e",
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
    },
});
