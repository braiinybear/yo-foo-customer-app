import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";

import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useCartStore } from "@/store/useCartStore";
import { useCreatePaymentOrder, useVerifyPayment } from "@/hooks/usePayments";
import { authClient } from "@/lib/auth-client";

// ─── Razorpay test key ────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_XXXXXXXX";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentStep = "idle" | "creating_razorpay_order" | "awaiting_payment" | "verifying" | "success" | "failed";

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();

    const { data: session } = authClient.useSession();
    const { items, totalAmount, clearCart } = useCartStore();

    const createPaymentOrder = useCreatePaymentOrder();
    const verifyPayment = useVerifyPayment();

    const [step, setStep] = useState<PaymentStep>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);


    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    // ── Main payment handler ──────────────────────────────────────────────────
    const handlePayNow = async () => {
        if (!orderId) {
            Alert.alert("Error", "No order found. Please go back to cart.");
            return;
        }

        setErrorMessage(null);

        try {
            // ── Step 1: Create Razorpay order on our backend ──────────────────
            setStep("creating_razorpay_order");
            const paymentData = await createPaymentOrder.mutateAsync(orderId);

            const { razorpayOrder } = paymentData;

            // ── Step 2: Open Razorpay SDK ─────────────────────────────────────
            setStep("awaiting_payment");

            const options = {
                description: "Food Delivery Payment",
                image: "", // optional logo URL
                currency: razorpayOrder.currency ?? "INR",
                key: RAZORPAY_KEY_ID,
                amount: String(razorpayOrder.amount), // in paise, must be string
                name: "Yo Foo",
                order_id: razorpayOrder.id,
                prefill: {
                    email: session?.user?.email ?? "",
                    contact: session?.user?.phoneNumber ?? "",
                    name: session?.user?.name ?? "",
                },
                theme: { color: Colors.primary },
            };

            const razorpayResponse = await RazorpayCheckout.open(options);

            // ── Step 3: Verify signature on our backend ───────────────────────
            setStep("verifying");
            await verifyPayment.mutateAsync({
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
                orderId: orderId,
            });

            // ── Step 4: Success ───────────────────────────────────────────────
            setStep("success");
            clearCart();
        } catch (error: any) {
            setStep("failed");
            // Razorpay SDK errors surface as { code, description }
            const description =
                error?.description ??
                error?.message ??
                "Payment could not be completed. Please try again.";
            setErrorMessage(description);
            console.error("Payment error:", error);
        }
    };

    // ── Retry ─────────────────────────────────────────────────────────────────
    const handleRetry = () => {
        setStep("idle");
        setErrorMessage(null);
    };

    // ── Success view ──────────────────────────────────────────────────────────
    if (step === "success") {
        return (
            <View style={[styles.fullCenter, { paddingTop: insets.top }]}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={90} color={Colors.success} />
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>
                    Your order has been confirmed and is being prepared.
                </Text>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace("/(tabs)/orders")}
                >
                    <Text style={styles.primaryButtonText}>Track My Order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.ghostButton}
                    onPress={() => router.replace("/(tabs)")}
                >
                    <Text style={styles.ghostButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main view ─────────────────────────────────────────────────────────────
    const isProcessing =
        step === "creating_razorpay_order" ||
        step === "awaiting_payment" ||
        step === "verifying";

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Order Summary Card ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Summary</Text>

                    {items.map((item) => (
                        <View key={item.id} style={styles.summaryRow}>
                            <View style={styles.summaryLeft}>
                                <View style={styles.vegDot} />
                                <Text style={styles.summaryItemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                            </View>
                            <Text style={styles.summaryQty}>×{item.quantity}</Text>
                            <Text style={styles.summaryPrice}>
                                {formatCurrency(item.price * item.quantity)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* ── Bill Details Card ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bill Details</Text>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billValue}>{formatCurrency(totalAmount)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <View style={styles.billLabelRow}>
                            <Text style={styles.billLabel}>Delivery Charges</Text>
                        </View>
                        <Text style={styles.billValue}>{formatCurrency(40)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Platform Fee</Text>
                        <Text style={styles.billValue}>{formatCurrency(5)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>GST & Charges</Text>
                        <Text style={styles.billValue}>{formatCurrency(totalAmount * 0.05)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.billRow}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>
                            {formatCurrency(totalAmount + 45 + totalAmount * 0.05)}
                        </Text>
                    </View>
                </View>

                {/* ── Payment Method Card ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment Method</Text>
                    <View style={styles.paymentMethodRow}>
                        <View style={styles.paymentIconWrapper}>
                            <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
                        </View>
                        <View style={styles.paymentTextWrapper}>
                            <Text style={styles.paymentMethodName}>Razorpay Secure Checkout</Text>
                            <Text style={styles.paymentMethodSub}>
                                UPI • Cards • Net Banking • Wallets
                            </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    </View>
                </View>

                {/* ── Error banner ── */}
                {step === "failed" && errorMessage && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="warning" size={18} color={Colors.danger} />
                        <Text style={styles.errorBannerText}>{errorMessage}</Text>
                    </View>
                )}
            </ScrollView>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                {/* Processing step indicator */}
                {isProcessing && (
                    <View style={styles.stepIndicator}>
                        <Text style={styles.stepIndicatorText}>
                            {step === "creating_razorpay_order" && "Setting up secure payment..."}
                            {step === "awaiting_payment" && "Waiting for payment confirmation..."}
                            {step === "verifying" && "Verifying payment..."}
                        </Text>
                    </View>
                )}

                {step === "failed" ? (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                        <Ionicons name="refresh" size={18} color={Colors.white} />
                        <Text style={styles.payButtonText}>Retry Payment</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
                        onPress={handlePayNow}
                        disabled={isProcessing}
                        activeOpacity={0.85}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={18} color={Colors.white} />
                                <Text style={styles.payButtonText}>
                                    Pay {formatCurrency(totalAmount + 45 + totalAmount * 0.05)} Securely
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                <Text style={styles.secureNote}>
                    🔒 Secured by Razorpay · 100% Safe & Encrypted
                </Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F5F6FA",
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },

    // ── Scroll ──────────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    scrollContent: {
        padding: 16,
        gap: 14,
    },

    // ── Cards ────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 14,
    },

    // ── Order Summary ─────────────────────────────────────────────────────────
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    summaryLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    vegDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.success,
        borderWidth: 1,
        borderColor: "#1a8a4a",
    },
    summaryItemName: {
        flex: 1,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    summaryQty: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginHorizontal: 8,
    },
    summaryPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        minWidth: 64,
        textAlign: "right",
    },

    // ── Bill ─────────────────────────────────────────────────────────────────
    billRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    billLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    billLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    billValue: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 10,
    },
    grandTotalLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    grandTotalValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.primary,
    },

    // ── Payment Method ────────────────────────────────────────────────────────
    paymentMethodRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    paymentIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    paymentTextWrapper: { flex: 1 },
    paymentMethodName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    paymentMethodSub: {
        fontFamily: Fonts.brand,
        fontSize: 12,
        color: Colors.muted,
        marginTop: 2,
    },

    // ── Error ─────────────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFF0F0",
        borderColor: Colors.danger,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
    },
    errorBannerText: {
        flex: 1,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.danger,
    },

    // ── Footer ───────────────────────────────────────────────────────────────
    footer: {
        backgroundColor: Colors.white,
        paddingTop: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 8,
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        justifyContent: "center",
    },
    stepIndicatorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    payButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.warning,
        paddingVertical: 16,
        borderRadius: 14,
    },
    payButtonDisabled: {
        opacity: 0.65,
    },
    payButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
    secureNote: {
        textAlign: "center",
        fontFamily: Fonts.brand,
        fontSize: 12,
        color: Colors.muted,
        marginTop: 10,
    },

    // ── Success ───────────────────────────────────────────────────────────────
    fullCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        backgroundColor: Colors.white,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.text,
        textAlign: "center",
        marginBottom: 12,
    },
    successSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 40,
    },
    primaryButton: {
        width: "100%",
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 12,
    },
    primaryButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
    ghostButton: {
        width: "100%",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    ghostButtonText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.textSecondary,
    },
});