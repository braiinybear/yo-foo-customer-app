import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AnimatedPressable } from "@/components/AnimatedPressable";

type Step = "phone" | "otp";
import { showAlert } from "@/store/useAlertStore";

export default function Login() {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const { data: session } = authClient.useSession();
    const [toggleEmailPhoneLogin, settoggleEmailPhoneLogin] = useState<boolean>(false);
    // Phone / OTP state
    const [phone, setPhone] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [step, setStep] = useState<Step>("phone");
    const [otpLoading, setOtpLoading] = useState<boolean>(false);
    const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
    const [haveReferralCode, setHaveReferralCode] = useState<boolean>(false);
    const [referralCode, setReferralCode] = useState<string>("");

    // Email / password state
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [emailLoading, setEmailLoading] = useState<boolean>(false);

    // ── Phone OTP ──────────────────────────────────────────────
    const handleSendOtp = async () => {
        if (!phone || phone.length < 10) {
            showAlert("Error", "Please enter a valid phone number");
            return;
        }
        setOtpLoading(true);
        try {
            await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
            setStep("otp");
        } catch (err: any) {
            showAlert("Error", err?.message ?? "Failed to send OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            showAlert("Error", "Please enter the OTP");
            return;
        }
        setVerifyLoading(true);
        try {
            await authClient.phoneNumber.verify(
                {
                    phoneNumber: phone,
                    code: otp,
                },
                {
                    body: haveReferralCode ? { invitedByCode: referralCode } : undefined,
                    onSuccess: async () => {
                        setVerifyLoading(false);
                    },
                    onError: (ctx) => {
                        showAlert("Verification Failed", ctx.error.message);
                    }
                }
            );
        } catch (err: any) {
            showAlert("Error", err?.message ?? "Verification failed");
        } finally {
            setVerifyLoading(false);
        }
    };

    // ── Email / Password ───────────────────────────────────────
    const handleEmailLogin = async () => {
        if (!email || !password) {
            showAlert("Error", "Please fill in all fields");
            return;
        }

        setEmailLoading(true);

        await authClient.signIn.email(
            { email, password },
            {
                    onSuccess: async () => {
                        setEmailLoading(false);
                    },
                onError: (ctx: any) => {
                    setEmailLoading(false);
                    showAlert("Login Failed", ctx.error.message);
                },
            }
        );
    };

    // ── Google ─────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
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
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {session?.user ? (
                    <Animated.View entering={FadeInDown.duration(600)} style={styles.profileContainer}>
                        <View style={styles.avatarWrapper}>
                            {session.user.image ? (
                                <Image source={{ uri: session.user.image }} style={styles.profileImage} />
                            ) : (
                                <View style={styles.placeholderAvatar}>
                                    <Text style={styles.avatarInitial}>
                                        {session.user.name?.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.profileName}>{session.user.name}</Text>
                        <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeInDown.springify().damping(15)}>
                        <Image
                            source={require("@/assets/images/app-logo.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>
                )}


                {/* ── PHONE OTP (default) ── */}
                {!toggleEmailPhoneLogin && (
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>
                            {step === "phone" ? "Sign in with Phone" : "Enter OTP"}
                        </Text>

                        {step === "phone" ? (
                            <>
                                <View style={styles.phoneRow}>
                                    <View style={styles.countryCode}>
                                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                                    </View>
                                    <TextInput
                                        placeholder="Phone number"
                                        placeholderTextColor={Colors.muted}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        style={styles.phoneInput}
                                    />
                                </View>
                                <AnimatedPressable
                                    style={[styles.primaryButton, otpLoading && styles.buttonDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? (
                                        <>
                                            <ActivityIndicator color={isDark ? Colors.background : "#fff"} />
                                            <Text style={styles.primaryButtonText}>Sending OTP...</Text>
                                        </>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                                    )}
                                </AnimatedPressable>

                                {/* Toggle to email */}
                                <AnimatedPressable
                                    style={styles.toggleRow}
                                    onPress={() => settoggleEmailPhoneLogin(true)}
                                    scaleIn={0.95}
                                >
                                    <Text style={styles.toggleText}>Login with Email instead</Text>
                                </AnimatedPressable>
                            </>
                        ) : (
                            <>
                                <Text style={styles.otpHint}>
                                    OTP sent to +91 {phone}{"  "}
                                    <Text
                                        style={styles.changePhone}
                                        onPress={() => { setStep("phone"); setOtp(""); }}
                                    >
                                        Change
                                    </Text>
                                </Text>

                                <TextInput
                                    placeholder="Enter 6-digit OTP"
                                    placeholderTextColor={Colors.muted}
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    style={[styles.input, styles.otpInput]}
                                />
                                {
                                    haveReferralCode && (
                                        <TextInput
                                            placeholder="Enter referral code"
                                            placeholderTextColor={Colors.muted}
                                            value={referralCode}
                                            onChangeText={setReferralCode}
                                            style={[styles.input, styles.referralCodeInput]}
                                        />
                                    )
                                }
                                {
                                    !haveReferralCode && (
                                        <AnimatedPressable onPress={() => setHaveReferralCode(true)} style={styles.referralCodeText} scaleIn={0.98}>
                                            <Text style={styles.referralCodeText}>Have a referral code?</Text>
                                        </AnimatedPressable>
                                    )
                                }
                                <AnimatedPressable
                                    style={[styles.primaryButton, verifyLoading && styles.buttonDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={verifyLoading}
                                >
                                    {verifyLoading ? (
                                        <>
                                            <ActivityIndicator color={isDark ? Colors.background : "#fff"} />
                                            <Text style={styles.primaryButtonText}>Verifying...</Text>
                                        </>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Verify & Login</Text>
                                    )}
                                </AnimatedPressable>

                                <AnimatedPressable
                                    style={styles.resendRow}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading}
                                    scaleIn={0.95}
                                >
                                    <Text style={styles.resendText}>
                                        {otpLoading ? "Resending..." : "Resend OTP"}
                                    </Text>
                                </AnimatedPressable>
                            </>
                        )}
                    </Animated.View>
                )}

                {/* ── EMAIL / PASSWORD (shown when toggled) ── */}
                {toggleEmailPhoneLogin && (
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>Email & Password</Text>

                        <TextInput
                            placeholder="Email Address"
                            placeholderTextColor={Colors.muted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                        />

                        <TextInput
                            placeholder="Password"
                            placeholderTextColor={Colors.muted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            style={styles.input}
                        />

                        <AnimatedPressable
                            style={[styles.secondaryButton, emailLoading && styles.buttonDisabled]}
                            onPress={handleEmailLogin}
                            disabled={emailLoading}
                        >
                            {emailLoading ? (
                                <>
                                    <ActivityIndicator color={isDark ? Colors.background : "#fff"} />
                                    <Text style={styles.secondaryButtonText}>Logging in...</Text>
                                </>
                            ) : (
                                <Text style={styles.secondaryButtonText}>Login with Email</Text>
                            )}
                        </AnimatedPressable>

                        {/* Back to phone */}
                        <AnimatedPressable
                            style={styles.toggleRow}
                            onPress={() => settoggleEmailPhoneLogin(false)}
                            scaleIn={0.95}
                        >
                            <Text style={styles.toggleText}>Back to phone login</Text>
                        </AnimatedPressable>
                    </Animated.View>
                )}

                {/* ── DIVIDER ── */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.divider} />
                </Animated.View>

                {/* ── Google ── */}
                <Animated.View entering={FadeInDown.delay(500).springify()}>
                    <AnimatedPressable
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                    >
                        <Image
                            source={require("@/assets/images/google-logo.png")}
                            style={styles.googleIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </AnimatedPressable>
                </Animated.View>

                {/* ── Register link ── */}
                <Animated.View entering={FadeInDown.delay(600)}>
                    <AnimatedPressable
                        onPress={() => router.push("/(auth)/register")}
                        style={styles.switchContainer}
                        scaleIn={0.98}
                    >
                        <Text style={styles.switchText}>New here? <Text style={{ color: Colors.primary }}>Create an account</Text></Text>
                    </AnimatedPressable>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
        justifyContent:"center",
        backgroundColor: Colors.background,
    },
    logo: {
        width: 200,
        height: 200,
        alignSelf: "center",
        marginBottom: 4,
    },
    title: {
        fontSize: FontSize.xxl,
        fontFamily: Fonts.brandBold,
        marginBottom: 28,
        textAlign: "center",
        color: Colors.text,
    },
    // ── Profile Preview ──────────────────────────────────────
    profileContainer: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surface,
        borderWidth: 3,
        borderColor: Colors.primary,
        overflow: "hidden",
        marginBottom: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    profileImage: {
        width: "100%",
        height: "100%",
    },
    placeholderAvatar: {
        width: "100%",
        height: "100%",
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: {
        fontSize: 40,
        fontFamily: Fonts.brandBold,
        color: Colors.white,
    },
    welcomeText: {
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        color: Colors.textSecondary,
    },
    profileName: {
        fontSize: FontSize.xl,
        fontFamily: Fonts.brandBold,
        color: Colors.text,
        marginTop: 4,
    },

    // ── Section ────────────────────────────────────────────────
    section: {
        width: "100%",
        marginBottom: 8,
    },
    sectionLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 10,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },

    // ── Phone Row ─────────────────────────────────────────────
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 8,
    },
    countryCode: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: Colors.surface,
    },
    countryCodeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        backgroundColor: Colors.surface,
        color: Colors.text,
    },

    // ── OTP ──────────────────────────────────────────────────
    otpHint: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    changePhone: {
        fontFamily: Fonts.brandBold,
        color: Colors.secondary,
    },
    otpInput: {
        textAlign: "left",
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    resendRow: {
        alignItems: "center",
        marginTop: 12,
    },
    resendText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.secondary,
    },

    // ── Inputs ───────────────────────────────────────────────
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        backgroundColor: Colors.surface,
        color: Colors.text,
    },

    // ── Buttons ──────────────────────────────────────────────
    primaryButton: {
        backgroundColor: isDark ? Colors.primary : Colors.secondary,
        height: 56,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: isDark ? Colors.primary : Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        color: isDark ? Colors.background : Colors.white,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    secondaryButton: {
        backgroundColor: isDark ? Colors.primary : Colors.secondary,
        height: 56,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: isDark ? Colors.primary : Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    secondaryButtonText: {
        color: isDark ? Colors.background : Colors.white,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    emailButton: {
        backgroundColor: Colors.text,
        padding: 5,
        borderRadius: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },

    // ── Divider ──────────────────────────────────────────────
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    divider: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: {
        marginHorizontal: 12,
        color: Colors.muted,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },

    // ── Google ───────────────────────────────────────────────
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
        height: 52,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 8,
    },
    googleIcon: { width: 35, height: 35 },
    emailIcon: { width: 17, height: 17 },
    googleButtonText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandMedium,
    },

    // ── Switch ───────────────────────────────────────────────
    switchContainer: { marginTop: 20, alignItems: "center" },
    switchText: {
        color: Colors.secondary,
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
    },

    // ── Login mode toggle ─────────────────────────────────────
    toggleRow: {
        alignItems: "center",
        marginTop: 14,
    },
    toggleText: {
        color: Colors.secondary,
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
    },
    referralCodeText: {
        color: Colors.secondary,
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
        textAlign: "center",
        marginBottom: 10,
        textDecorationLine: "underline",
    },
    referralCodeInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 15,
        borderRadius: 12,
        backgroundColor: Colors.background,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
        color: Colors.text,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        marginBottom: 8,
    }
});
