import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";

import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import {
    useWalletBalance,
    useWalletTransactions,
    useWalletTopUp,
    useVerifyWalletTopUp,
} from "@/hooks/usePayments";
import { WalletTransaction } from "@/types/razorpay";

// ─── Razorpay key ─────────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID =
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_XXXXXXXX";

// ─── Quick-add amounts (₹) ────────────────────────────────────────────────────
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toFixed(2)}`;

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Transaction Row ─────────────────────────────────────────────────────────
const TxRow = ({ tx }: { tx: WalletTransaction }) => {
    // API uses "TOPUP" for credits into wallet, "DEBIT" for spending
    const isCredit = tx.type?.toUpperCase() === "TOPUP";

    const label =
        tx.type?.toUpperCase() === "TOPUP"
            ? "Wallet Top-up"
            : tx.type?.toUpperCase() === "DEBIT"
                ? "Order Payment"
                : tx.type ?? "Transaction";

    return (
        <View style={styles.txRow}>
            <View
                style={[
                    styles.txIconWrap,
                    { backgroundColor: isCredit ? "#E8FAF0" : "#FFF0F0" },
                ]}
            >
                <Ionicons
                    name={isCredit ? "arrow-down-circle" : "arrow-up-circle"}
                    size={22}
                    color={isCredit ? Colors.success : Colors.danger}
                />
            </View>

            <View style={styles.txMeta}>
                <Text style={styles.txDesc} numberOfLines={1}>
                    {label}
                </Text>
                <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
            </View>

            <View style={styles.txRight}>
                <Text
                    style={[
                        styles.txAmount,
                        { color: isCredit ? Colors.success : Colors.danger },
                    ]}
                >
                    {isCredit ? "+" : "-"}
                    {fmt(Number(tx.amount))}
                </Text>
                <View
                    style={[
                        styles.txBadge,
                        {
                            backgroundColor: isCredit ? "#E8FAF0" : "#FFF0F0",
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.txBadgeText,
                            { color: isCredit ? Colors.success : Colors.danger },
                        ]}
                    >
                        {tx.type?.toUpperCase()}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WalletScreen() {
    const { data: session } = authClient.useSession();

    const {
        data: wallet,
        isLoading: balanceLoading,
        refetch: refetchBalance,
    } = useWalletBalance();

    const {
        data: transactions,
        isLoading: txLoading,
        refetch: refetchTx,
    } = useWalletTransactions();

    const topUpMutation = useWalletTopUp();
    const verifyMutation = useVerifyWalletTopUp();

    // ── Local state ───────────────────────────────────────────────────────────
    const [showModal, setShowModal] = useState(false);
    const [customAmount, setCustomAmount] = useState("");
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [topUpStep, setTopUpStep] = useState<
        "idle" | "creating" | "awaiting" | "verifying" | "success" | "failed"
    >("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // ── Pull-to-refresh ───────────────────────────────────────────────────────
    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchBalance(), refetchTx()]);
        setRefreshing(false);
    };

    // ── Resolve amount to top-up ──────────────────────────────────────────────
    const resolvedAmount = selectedAmount ?? parseInt(customAmount || "0", 10);

    // ── Full top-up flow ──────────────────────────────────────────────────────
    const handleTopUp = async () => {
        const amount = resolvedAmount;
        if (!amount || amount < 1) {
            Alert.alert("Invalid Amount", "Please select or enter a valid amount.");
            return;
        }

        setErrorMsg(null);
        try {
            // Step 1 – Call backend to create Razorpay order
            setTopUpStep("creating");
            const topUpData = await topUpMutation.mutateAsync({ amount });
            const { razorpayOrder } = topUpData;

            // Step 2 – Open Razorpay checkout
            setTopUpStep("awaiting");
            const options = {
                description: "Yo Foo Wallet Top-up",
                currency: razorpayOrder.currency ?? "INR",
                key: RAZORPAY_KEY_ID,
                amount: String(razorpayOrder.amount), // paise
                name: "Yo Foo",
                order_id: razorpayOrder.id,
                prefill: {
                    email: session?.user?.email ?? "",
                    contact: (session?.user as any)?.phoneNumber ?? "",
                    name: session?.user?.name ?? "",
                },
                theme: { color: Colors.primary },
            };

            const razorpayResponse = await RazorpayCheckout.open(options);

            // Step 3 – Verify signature
            setTopUpStep("verifying");
            await verifyMutation.mutateAsync({
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
            });

            setTopUpStep("success");
        } catch (err: any) {
            setTopUpStep("failed");
            const msg =
                err?.description ??
                err?.message ??
                "Top-up failed. Please try again.";
            setErrorMsg(msg);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedAmount(null);
        setCustomAmount("");
        setTopUpStep("idle");
        setErrorMsg(null);
    };

    const isProcessing =
        topUpStep === "creating" ||
        topUpStep === "awaiting" ||
        topUpStep === "verifying";

    // ── Loading skeleton ──────────────────────────────────────────────────────
    const isLoading = balanceLoading;

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* ── Balance Card ── */}
                <View style={styles.balanceCard}>
                    {/* Decorative circles */}
                    <View style={styles.circle1} />
                    <View style={styles.circle2} />

                    <View style={styles.balanceTop}>
                        <View style={styles.balanceIconWrap}>
                            <Ionicons name="wallet" size={24} color={Colors.white} />
                        </View>
                        <Text style={styles.balanceLabel}>Available Balance</Text>
                        <TouchableOpacity
                            style={styles.cardRefreshBtn}
                            onPress={onRefresh}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="refresh" size={16} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator
                            color={Colors.white}
                            size="large"
                            style={{ marginVertical: 16 }}
                        />
                    ) : (
                        <Text style={styles.balanceAmount}>
                            {fmt(wallet?.balance ?? 0)}
                        </Text>
                    )}

                    <View style={styles.balanceSeparator} />

                    <View style={styles.balanceFooter}>
                        <View style={styles.balanceFooterItem}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={14}
                                color="rgba(255,255,255,0.8)"
                            />
                            <Text style={styles.balanceFooterText}>Secured Balance</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.topUpChip}
                            onPress={() => setShowModal(true)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add" size={16} color={Colors.primary} />
                            <Text style={styles.topUpChipText}>Add Money</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Quick Stat Pills ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                        <Ionicons
                            name="arrow-down-circle-outline"
                            size={18}
                            color={Colors.success}
                        />
                        <Text style={styles.statLabel}>Total Added</Text>
                        <Text style={[styles.statValue, { color: Colors.success }]}>
                            {fmt(
                                (transactions ?? [])
                                    .filter((t) => t.type?.toUpperCase() === "TOPUP")
                                    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
                            )}
                        </Text>
                    </View>
                    <View style={styles.statPill}>
                        <Ionicons
                            name="arrow-up-circle-outline"
                            size={18}
                            color={Colors.danger}
                        />
                        <Text style={styles.statLabel}>Total Spent</Text>
                        <Text style={[styles.statValue, { color: Colors.danger }]}>
                            {fmt(
                                (transactions ?? [])
                                    .filter((t) => t.type?.toUpperCase() === "DEBIT")
                                    .reduce((s, t) => s + (Number(t.amount) || 0), 0)
                            )}
                        </Text>
                    </View>
                    <View style={styles.statPill}>
                        <Ionicons
                            name="receipt-outline"
                            size={18}
                            color={Colors.secondary}
                        />
                        <Text style={styles.statLabel}>Transactions</Text>
                        <Text style={[styles.statValue, { color: Colors.secondary }]}>
                            {(transactions ?? []).length}
                        </Text>
                    </View>
                </View>

                {/* ── Transactions ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>

                    {txLoading ? (
                        <View style={styles.txLoadingWrap}>
                            <ActivityIndicator color={Colors.primary} />
                            <Text style={styles.txLoadingText}>
                                Loading transactions…
                            </Text>
                        </View>
                    ) : !transactions || transactions.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons
                                name="receipt-outline"
                                size={56}
                                color={Colors.border}
                            />
                            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Add money to your wallet and start ordering!
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyAddBtn}
                                onPress={() => setShowModal(true)}
                            >
                                <Ionicons name="add" size={18} color={Colors.white} />
                                <Text style={styles.emptyAddBtnText}>Add Money</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.txList}>
                            {transactions.map((tx) => (
                                <TxRow key={tx.id} tx={tx} />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Top-up Bottom Sheet Modal ── */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={topUpStep === "idle" || topUpStep === "failed" ? closeModal : undefined}
                    />

                    <View style={styles.modalSheet}>
                        {/* Handle */}
                        <View style={styles.modalHandle} />

                        {/* ─── Success state ─── */}
                        {topUpStep === "success" ? (
                            <View style={styles.modalSuccess}>
                                <View style={styles.successCircle}>
                                    <Ionicons
                                        name="checkmark"
                                        size={40}
                                        color={Colors.white}
                                    />
                                </View>
                                <Text style={styles.successTitle}>
                                    ₹{resolvedAmount} Added!
                                </Text>
                                <Text style={styles.successSubtitle}>
                                    Your wallet has been topped up successfully.
                                </Text>
                                <TouchableOpacity
                                    style={styles.doneBtn}
                                    onPress={closeModal}
                                >
                                    <Text style={styles.doneBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Add Money to Wallet</Text>
                                <Text style={styles.modalSubtitle}>
                                    Select a quick amount or enter a custom value
                                </Text>

                                {/* Quick amounts */}
                                <View style={styles.quickAmounts}>
                                    {QUICK_AMOUNTS.map((a) => (
                                        <TouchableOpacity
                                            key={a}
                                            style={[
                                                styles.quickChip,
                                                selectedAmount === a &&
                                                styles.quickChipActive,
                                            ]}
                                            onPress={() => {
                                                setSelectedAmount(a);
                                                setCustomAmount("");
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <Text
                                                style={[
                                                    styles.quickChipText,
                                                    selectedAmount === a &&
                                                    styles.quickChipTextActive,
                                                ]}
                                            >
                                                ₹{a}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Custom amount input */}
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputCurrency}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter custom amount"
                                        placeholderTextColor={Colors.muted}
                                        keyboardType="numeric"
                                        value={customAmount}
                                        onChangeText={(v) => {
                                            setCustomAmount(v);
                                            setSelectedAmount(null);
                                        }}
                                    />
                                </View>

                                {/* Error */}
                                {topUpStep === "failed" && errorMsg && (
                                    <View style={styles.errorBanner}>
                                        <Ionicons
                                            name="warning-outline"
                                            size={16}
                                            color={Colors.danger}
                                        />
                                        <Text style={styles.errorText}>{errorMsg}</Text>
                                    </View>
                                )}

                                {/* Processing indicator */}
                                {isProcessing && (
                                    <View style={styles.processingRow}>
                                        <Text style={styles.processingText}>
                                            {topUpStep === "creating" &&
                                                "Setting up payment…"}
                                            {topUpStep === "awaiting" &&
                                                "Waiting for payment…"}
                                            {topUpStep === "verifying" &&
                                                "Verifying payment…"}
                                        </Text>
                                    </View>
                                )}

                                {/* CTA */}
                                <TouchableOpacity
                                    style={[
                                        styles.payBtn,
                                        (isProcessing || !resolvedAmount) &&
                                        styles.payBtnDisabled,
                                    ]}
                                    onPress={
                                        topUpStep === "failed"
                                            ? () => {
                                                setTopUpStep("idle");
                                                setErrorMsg(null);
                                            }
                                            : handleTopUp
                                    }
                                    disabled={isProcessing}
                                    activeOpacity={0.85}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name={
                                                    topUpStep === "failed"
                                                        ? "refresh"
                                                        : "lock-closed"
                                                }
                                                size={18}
                                                color={Colors.white}
                                            />
                                            <Text style={styles.payBtnText}>
                                                {topUpStep === "failed"
                                                    ? "Retry"
                                                    : resolvedAmount
                                                        ? `Add ${fmt(resolvedAmount)} Securely`
                                                        : "Add Money"}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <Text style={styles.secureNote}>
                                    🔒 Secured by Razorpay · 100% Safe & Encrypted
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F5F6FA",
    },
    refreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Scroll ──────────────────────────────────────────────────────────────
    scroll: {
        padding: 13,
        gap: 16,
    },

    // ── Balance Card ─────────────────────────────────────────────────────────
    balanceCard: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        padding: 22,
        overflow: "hidden",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    circle1: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "rgba(255,255,255,0.08)",
        top: -60,
        right: -40,
    },
    circle2: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.06)",
        bottom: -30,
        left: 20,
    },
    balanceTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 12,
    },
    balanceIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    balanceLabel: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: 0.5,
        flex: 1,
    },
    cardRefreshBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },


    balanceAmount: {
        fontFamily: Fonts.brandBlack,
        fontSize: 42,
        color: Colors.white,
        letterSpacing: 0.5,
        marginBottom: 18,
    },
    balanceSeparator: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.2)",
        marginBottom: 14,
    },
    balanceFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    balanceFooterItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    balanceFooterText: {
        fontFamily: Fonts.brand,
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
    },
    topUpChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.white,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    topUpChipText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },

    // ── Stat Pills ───────────────────────────────────────────────────────────
    statsRow: {
        flexDirection: "row",
        gap: 10,
    },
    statPill: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statLabel: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
        textAlign: "center",
    },
    statValue: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        textAlign: "center",
    },

    // ── Section ──────────────────────────────────────────────────────────────
    section: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 14,
    },

    // ── Transaction List ─────────────────────────────────────────────────────
    txList: {
        gap: 4,
    },
    txRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    txIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    txMeta: {
        flex: 1,
    },
    txDesc: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 3,
    },
    txDate: {
        fontFamily: Fonts.brand,
        fontSize: 11,
        color: Colors.muted,
    },
    txRight: {
        alignItems: "flex-end",
        gap: 4,
    },
    txAmount: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
    },
    txBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    txBadgeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
    },

    // ── Loading / Empty ──────────────────────────────────────────────────────
    txLoadingWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        justifyContent: "center",
        paddingVertical: 24,
    },
    txLoadingText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    emptyWrap: {
        alignItems: "center",
        paddingVertical: 32,
        gap: 8,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginTop: 8,
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: "center",
        lineHeight: 20,
    },
    emptyAddBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    emptyAddBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.white,
    },

    // ── Modal ────────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        alignSelf: "center",
        marginBottom: 18,
    },
    modalTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
        color: Colors.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginBottom: 20,
    },

    // ── Quick amounts ────────────────────────────────────────────────────────
    quickAmounts: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
    },
    quickChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    quickChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    quickChipText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    quickChipTextActive: {
        color: Colors.primary,
    },

    // ── Custom input ─────────────────────────────────────────────────────────
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        marginBottom: 16,
    },
    inputCurrency: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xl,
        color: Colors.text,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xl,
        color: Colors.text,
    },

    // ── Error ────────────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFF0F0",
        borderColor: Colors.danger,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    errorText: {
        flex: 1,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.danger,
    },

    // ── Processing ───────────────────────────────────────────────────────────
    processingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 12,
    },
    processingText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },

    // ── Pay button ───────────────────────────────────────────────────────────
    payBtn: {
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
        marginBottom: 10,
    },
    payBtnDisabled: { opacity: 0.55 },
    payBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
    secureNote: {
        textAlign: "center",
        fontFamily: Fonts.brand,
        fontSize: 12,
        color: Colors.muted,
        marginBottom: 4,
    },

    // ── Success ──────────────────────────────────────────────────────────────
    modalSuccess: {
        alignItems: "center",
        paddingVertical: 24,
        gap: 12,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.success,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    successTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.text,
    },
    successSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: "center",
    },
    doneBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 48,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    doneBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
    },
});