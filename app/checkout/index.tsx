import React, { useState } from "react";
import {
    ActivityIndicator,
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

import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { useCartStore } from "@/store/useCartStore";
import { useCreatePaymentOrder, useVerifyPayment } from "@/hooks/usePayments";
import { useAvailableCoupons, useValidateCoupon } from "@/hooks/useCoupons";
import { authClient } from "@/lib/auth-client";
import { showAlert } from "@/store/useAlertStore";
import { Coupon, ValidateCouponResponse } from "@/types/coupons";
import { CouponDetailModal } from "@/components/CouponDetailModal";

// ─── Razorpay test key ────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_XXXXXXXX";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentStep = "idle" | "creating_razorpay_order" | "awaiting_payment" | "verifying" | "success" | "failed";

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { orderId, amount } = useLocalSearchParams<{ orderId: string; amount: string }>();

    const { data: session } = authClient.useSession();
    const { Colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const { items, clearCart } = useCartStore();

    // itemTotal comes from the route param so it survives cart being cleared
    const itemTotal = parseFloat(amount ?? '0');

    const createPaymentOrder = useCreatePaymentOrder();
    const verifyPayment = useVerifyPayment();

    const { data: availableCoupons } = useAvailableCoupons();
    const validateCouponMutation = useValidateCoupon();

    const [step, setStep] = useState<PaymentStep>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);
    const [couponCode, setCouponCode] = useState("");

    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);


    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    const deliveryCharge = 40;
    const platformFee = 5;
    const gstAndCharges = itemTotal * 0.05;
    const subTotal = itemTotal + deliveryCharge + platformFee + gstAndCharges;
    const grandTotal = subTotal - (appliedCoupon?.discount ?? 0);

    const handleApplyCoupon = async () => {
        handleApplyCouponWithValue(couponCode);
    };

    const handleApplyCouponWithValue = async (code: string) => {
        if (!code.trim()) return;

        try {
            const result = await validateCouponMutation.mutateAsync({
                code: code,
                orderTotal: itemTotal,
            });
            setAppliedCoupon(result);
            showAlert("Success", result.message);
        } catch (error: any) {
            showAlert("Invalid Coupon", error?.response?.data?.message || "This coupon could not be applied.");
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
    };

    // ── Main payment handler ──────────────────────────────────────────────────
    const handlePayNow = async () => {
        if (!orderId) {
            showAlert("Error", "No order found. Please go back to cart.");
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
            <CouponDetailModal
                visible={isCouponModalVisible}
                coupon={selectedCoupon}
                onClose={() => setIsCouponModalVisible(false)}
                onApply={(code) => {
                    setCouponCode(code);
                    handleApplyCouponWithValue(code);
                }}
            />
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

                {/* ── Offers & Coupons ── */}
                <View style={[styles.card, { paddingBottom: appliedCoupon ? 12 : 18 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Offers & Coupons</Text>
                        <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                    </View>

                    {appliedCoupon ? (
                        <View style={styles.appliedCouponContainer}>
                            <View style={styles.couponInfo}>
                                <View style={styles.couponTag}>
                                    <Text style={styles.couponTagText}>{appliedCoupon.code}</Text>
                                </View>
                                <Text style={styles.couponSavings}>Savings: {formatCurrency(appliedCoupon.discount)}</Text>
                            </View>
                            <TouchableOpacity onPress={handleRemoveCoupon}>
                                <Text style={styles.removeCouponText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {availableCoupons && availableCoupons.length > 0 && (
                        <View style={styles.availableList}>
                            <Text style={styles.availableTitle}>Available for you:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {availableCoupons.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={styles.availableItem}
                                        onPress={() => {
                                            setSelectedCoupon(c);
                                            setIsCouponModalVisible(true);
                                        }}
                                    >
                                        <Text style={styles.availableItemText}>{c.code}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* ── Bill Details Card ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bill Details</Text>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billValue}>{formatCurrency(itemTotal)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <View style={styles.billLabelRow}>
                            <Text style={styles.billLabel}>Delivery Charges</Text>
                        </View>
                        <Text style={styles.billValue}>{formatCurrency(deliveryCharge)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Platform Fee</Text>
                        <Text style={styles.billValue}>{formatCurrency(platformFee)}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>GST & Charges</Text>
                        <Text style={styles.billValue}>{formatCurrency(gstAndCharges)}</Text>
                    </View>

                    {appliedCoupon && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: Colors.success }]}>Coupon ({appliedCoupon.code})</Text>
                            <Text style={[styles.billValue, { color: Colors.success }]}>-{formatCurrency(appliedCoupon.discount)}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.billRow}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>
                            {formatCurrency(grandTotal)}
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
                                    Pay {formatCurrency(grandTotal)} Securely
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
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.surface,
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
        color: Colors.secondary, // Midnight Navy
    },

    // ── Scroll ──────────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    scrollContent: {
        padding: 16,
        gap: 14,
    },

    // ── Cards ────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.secondary, // Midnight Navy
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
        color: Colors.secondary, // Midnight Navy
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
        marginVertical: 12,
    },
    grandTotalLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.secondary, // Midnight Navy
    },
    grandTotalValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
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
        backgroundColor: Colors.secondary + '10',
        alignItems: "center",
        justifyContent: "center",
    },
    paymentTextWrapper: { flex: 1 },
    paymentMethodName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.secondary, // Midnight Navy
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
        backgroundColor: Colors.surface,
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
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
        height: 56,
        borderRadius: 16,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.warning,
        height: 56,
        borderRadius: 16,
    },
    payButtonDisabled: {
        opacity: 0.6,
    },
    payButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary, // Gold
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
        backgroundColor: Colors.background,
    },
    successIcon: {
        marginBottom: 24,
    },

    // ── Coupons Styles ──────────────────────────────────────────────────────
    couponInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        height: 48,
    },
    applyBtn: {
        backgroundColor: Colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 6,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    applyBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.primary,
    },
    appliedCouponContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0FFF4',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.success,
    },
    couponInfo: {
        flex: 1,
    },
    couponTag: {
        backgroundColor: Colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    couponTagText: {
        color: Colors.white,
        fontFamily: Fonts.brandBold,
        fontSize: 10,
    },
    couponSavings: {
        fontFamily: Fonts.brandMedium,
        fontSize: 12,
        color: Colors.text,
    },
    removeCouponText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.danger,
    },
    availableList: {
        marginTop: 12,
    },
    availableTitle: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
        color: Colors.muted,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    availableItem: {
        backgroundColor: Colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    availableItemText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.primary,
    },
    successTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.secondary, // Midnight Navy
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
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 12,
    },
    primaryButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary, // Gold
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