import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import Animated, { 
    useSharedValue, 
    useAnimatedProps, 
    withTiming, 
    useDerivedValue,
    interpolate,
    FadeInDown,
    FadeInUp
} from "react-native-reanimated";
import { AnimatedPressable } from "@/components/AnimatedPressable";

// Remove static import
// import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { showAlert } from "@/store/useAlertStore";
import { authClient } from "@/lib/auth-client";
import {
    useWalletBalance,
    useWalletTransactions,
    useWalletTopUp,
    useVerifyWalletTopUp,
} from "@/hooks/usePayments";
import { WalletTransaction } from "@/types/razorpay";
import { WalletSkeleton } from "@/components/loadingSkelton/WalletSkeleton";

// ─── Razorpay key ─────────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID =
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_XXXXXXXX";

// ─── Quick-add amounts (₹) ────────────────────────────────────────────────────
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

const fmt = (n: number) => `₹${n.toFixed(2)}`;

// Create a Reanimated compatible TextInput
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

/** Returns true for any transaction type that represents a credit/top-up */
function isCredit(tx: WalletTransaction): boolean {
    return tx.direction === 'CREDIT';
}

/** Returns true for any debit — ORDER_PAYMENT, DEBIT, or any unrecognised type */
function isDebit(tx: WalletTransaction): boolean {
    return tx.direction === 'DEBIT';
}

/** Human-readable label for each transaction type */
function txLabel(tx: WalletTransaction): string {
    const t = tx.type?.toUpperCase() ?? '';
    if (t === 'TOPUP') return 'Wallet Top-up';
    if (t === 'DEBIT') return 'Order Payment';
    if (t.startsWith('ORDER_PAYMENT')) return 'Order Payment';
    if (t === 'REFERRAL_BONUS_WELCOME') return 'Referral Bonus 🎉';
    if (t.startsWith('REFERRAL_BONUS')) return 'Referral Reward 🎁';
    if (t.startsWith('REFUND')) return 'Refund';
    if (t.startsWith('WITHDRAWAL_REJECTED_REFUND')) return 'Withdrawal Refund';
    if (t.startsWith('WITHDRAWAL')) return 'Withdrawal';
    if (t.startsWith('DELIVERY_PAYOUT') || t.startsWith('DELIVERY_TIP_PAYOUT')) return 'Delivery Payout';
    if (t === 'ADMIN_CREDIT') return 'Admin Credit';
    return 'Transaction';
}

// --- Transaction Row ---
const TxRow = ({ tx, Colors, styles }: { tx: WalletTransaction, Colors: any, styles: any }) => {
    const credit = isCredit(tx);
    return (
        <View style={styles.txRow}>
            {/* Icon */}
            <View
                style={[
                    styles.txIconWrap,
                    { backgroundColor: credit ? Colors.success + "18" : Colors.danger + "14" },
                ]}
            >
                <Ionicons
                    name={credit ? "arrow-down-circle" : "arrow-up-circle"}
                    size={22}
                    color={credit ? Colors.success : Colors.danger}
                />
            </View>

            {/* Label + date */}
            <View style={styles.txMeta}>
                <Text style={styles.txDesc} numberOfLines={1}>
                    {txLabel(tx)}
                </Text>
                <Text style={styles.txDate} numberOfLines={1}>
                    {formatDate(tx.createdAt)}
                </Text>
            </View>

            {/* Amount + badge */}
            <View style={styles.txRight}>
                <Text
                    style={[
                        styles.txAmount,
                        { color: credit ? Colors.success : Colors.danger },
                    ]}
                >
                    {credit ? "+" : ""}{fmt(Math.abs(Number(tx.amount)))}
                </Text>
                <View
                    style={[
                        styles.txBadge,
                        { backgroundColor: credit ? Colors.success + "18" : Colors.danger + "14" },
                    ]}
                >
                    <Text
                        style={[
                            styles.txBadgeText,
                            { color: credit ? Colors.success : Colors.danger },
                        ]}
                    >
                        {credit ? "CREDIT" : "DEBIT"}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WalletScreen() {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { data: session } = authClient.useSession();

    const {
        data: wallet,
        isLoading: balanceLoading,
        refetch: refetchBalance,
    } = useWalletBalance();
   console.log(" wallet",wallet)
    const {
        data: txPagedData,
        isLoading: txLoading,
        isFetchingNextPage: txFetchingMore,
        hasNextPage: txHasNextPage,
        fetchNextPage: txFetchNextPage,
        refetch: refetchTx,
    } = useWalletTransactions();
    // Flatten all pages into a single array
    const txList: WalletTransaction[] = useMemo(
        () => txPagedData?.pages.flatMap((p) => p.data) ?? [],
        [txPagedData]
    );
    const txTotal = txPagedData?.pages[0]?.meta.total ?? 0;

    const topUpMutation = useWalletTopUp();
    const verifyMutation = useVerifyWalletTopUp();

    const [showModal, setShowModal] = useState(false);
    const [customAmount, setCustomAmount] = useState("");
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [topUpStep, setTopUpStep] = useState<
        "idle" | "creating" | "awaiting" | "verifying" | "success" | "failed"
    >("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // ── Animation ─────────────────────────────────────────────────────────────
    const animatedBalance = useSharedValue(0);

    React.useEffect(() => {
        if (wallet?.balance != null && !balanceLoading) {
            animatedBalance.value = withTiming(wallet.balance, { 
                duration: 1500 
            });
        }
    }, [wallet?.balance, balanceLoading]);

    const animatedProps = useAnimatedProps(() => {
        return {
            text: `₹${animatedBalance.value.toFixed(2)}`,
        } as any;
    });

    // ── Pull-to-refresh ───────────────────────────────────────────────────────
    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchBalance(), refetchTx()]);
        setRefreshing(false);
    };

    // ── Infinite scroll handler ───────────────────────────────────────────────
    const handleEndReached = useCallback(() => {
        if (txHasNextPage && !txFetchingMore) txFetchNextPage();
    }, [txHasNextPage, txFetchingMore, txFetchNextPage]);

    // ── Computed stats ────────────────────────────────────────────────────────
    // Use global sums from backend meta (calculated from full transaction history)
    const totalAdded = txPagedData?.pages[0]?.meta.totalAdded ?? 0;
    const totalSpent = txPagedData?.pages[0]?.meta.totalSpent ?? 0;

    // ── Resolve top-up amount ─────────────────────────────────────────────────
    const resolvedAmount = selectedAmount ?? parseInt(customAmount || "0", 10);

    // ── Full top-up flow ──────────────────────────────────────────────────────
    const handleTopUp = async () => {
        const amount = resolvedAmount;
        if (!amount || amount < 1) {
            showAlert("Invalid Amount", "Please select or enter a valid amount.");
            return;
        }

        setErrorMsg(null);
        try {
            setTopUpStep("creating");
            const topUpData = await topUpMutation.mutateAsync({ amount });
            const { razorpayOrder } = topUpData;

            setTopUpStep("awaiting");
            const options = {
                description: "Yo Foo Wallet Top-up",
                currency: razorpayOrder.currency ?? "INR",
                key: RAZORPAY_KEY_ID,
                amount: String(razorpayOrder.amount),
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

    // ── FlatList header: balance card + stats ─────────────────────────────────


    // ── Footer spinner ────────────────────────────────────────────────────────
    const ListFooter = txFetchingMore ? (
        <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={styles.footerSpinner}
        />
    ) : null;

    if (balanceLoading && txLoading && !refreshing) {
        return (
            <View style={styles.root}>
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scroll}
                    decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
                    scrollEventThrottle={16}
                >
                    <WalletSkeleton />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {/* ── Order Success Banner ────────────────────────────────── */}
                {orderId && (
                    <Animated.View entering={FadeInUp.springify().damping(22).stiffness(100)} style={styles.orderPlacedCard} needsOffscreenAlphaCompositing={true}>
                        <View style={styles.orderPlacedIcon}>
                            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.orderPlacedTitle}>Order Placed Successfully!</Text>
                            <Text style={styles.orderPlacedSub}>Payment deducted from your wallet.</Text>
                        </View>
                        <AnimatedPressable
                            style={styles.trackOrderBtn}
                            onPress={() => router.replace(`/(tabs)/orders`)}
                            scaleIn={0.94}
                        >
                            <Text style={styles.trackOrderText}>Track Order</Text>
                        </AnimatedPressable>
                    </Animated.View>
                )}

                {/* ── Balance Card ─────────────────────────────────────── */}
                <Animated.View entering={FadeInUp.duration(600).springify().damping(20).stiffness(90)} style={styles.balanceCard} needsOffscreenAlphaCompositing={true}>
                    <View style={styles.circle1} />
                    <View style={styles.circle2} />
                    <View style={styles.cardTopRow}>
                        <View style={styles.cardIconWrap}>
                            <Ionicons name="wallet" size={22} color={Colors.white} />
                        </View>
                        <Text style={styles.cardLabel}>Available Balance</Text>
                        <TouchableOpacity style={styles.cardRefreshBtn} onPress={onRefresh} activeOpacity={0.75}>
                            <Ionicons name="refresh" size={15} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    {balanceLoading ? (
                        <ActivityIndicator color={Colors.white} size="large" style={{ marginVertical: 18 }} />
                    ) : (
                        <AnimatedTextInput
                            editable={false}
                            underlineColorAndroid="transparent"
                            style={styles.balanceAmount}
                            animatedProps={animatedProps}
                            value={fmt(wallet?.balance ?? 0)}
                        />
                    )}
                    <View style={styles.cardDivider} />
                    <View style={styles.cardFooterRow}>
                        <View style={styles.cardFooterLeft}>
                            <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.75)" />
                            <Text style={styles.cardFooterText}>Secured Balance</Text>
                        </View>
                        <AnimatedPressable style={styles.addMoneyChip} onPress={() => setShowModal(true)} scaleIn={0.93}>
                            <Ionicons name="add" size={16} color="#0D1B2A" />
                            <Text style={styles.addMoneyChipText}>Add Money</Text>
                        </AnimatedPressable>
                    </View>
                </Animated.View>

                {/* ── Stat Pills ───────────────────────────────────────── */}
                <Animated.View entering={FadeInUp.delay(100).duration(600).springify().damping(20).stiffness(90)} style={styles.statsRow} needsOffscreenAlphaCompositing={true}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: Colors.success + "18" }]}>
                            <Ionicons name="arrow-down-circle-outline" size={20} color={Colors.success} />
                        </View>
                        <Text style={styles.statLabel}>Total Added</Text>
                        <Text style={[styles.statValue, { color: Colors.success }]}>
                            {txLoading ? "—" : fmt(totalAdded)}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: Colors.danger + "14" }]}>
                            <Ionicons name="arrow-up-circle-outline" size={20} color={Colors.danger} />
                        </View>
                        <Text style={styles.statLabel}>Total Spent</Text>
                        <Text style={[styles.statValue, { color: Colors.danger }]}>
                            {txLoading ? "—" : fmt(Math.abs(totalSpent))}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + "20" }]}>
                            <Ionicons name="receipt-outline" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.statLabel}>Transactions</Text>
                        <Text style={[styles.statValue, { color: Colors.secondary }]}>
                            {txLoading ? "—" : txTotal}
                        </Text>
                    </View>
                </Animated.View>

                {/* ── Transaction History Card ──────────────────────────── */}
                <Animated.View entering={FadeInUp.delay(200).duration(600).springify().damping(20).stiffness(90)} style={styles.txCard} needsOffscreenAlphaCompositing={true}>
                    {/* Card header */}
                    <View style={styles.txCardHeader}>
                        <View style={styles.txCardTitleRow}>
                            <View style={styles.txCardIconWrap}>
                                <Ionicons name="list" size={16} color={Colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Transaction History</Text>
                        </View>
    
                    </View>

                    {/* Divider */}
                    <View style={styles.txCardDivider} />

                    {/* Body */}
                    {txLoading ? (
                        <View style={styles.centerWrap}>
                            <ActivityIndicator color={Colors.primary} />
                            <Text style={styles.muteText}>Loading transactions…</Text>
                        </View>
                    ) : txList.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="receipt-outline" size={40} color={Colors.muted} />
                            </View>
                            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Add money to your wallet and start ordering!
                            </Text>
                            <AnimatedPressable style={styles.emptyAddBtn} onPress={() => setShowModal(true)} scaleIn={0.94}>
                                <Ionicons name="add" size={16} color="#0D1B2A" />
                                <Text style={styles.emptyAddBtnText}>Add Money</Text>
                            </AnimatedPressable>
                        </View>
                    ) : (
                        <View style={styles.txInnerScroll}>
                            {txList.map((tx, idx) => (
                                <Animated.View key={tx.id} entering={FadeInDown.delay(Math.min(idx * 40, 400)).springify().damping(22).stiffness(110)} needsOffscreenAlphaCompositing={true}>
                                    <TxRow tx={tx} Colors={Colors} styles={styles} />
                                </Animated.View>
                            ))}

                            {txFetchingMore && (
                                <View style={styles.centerWrap}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.muteText}>Loading more…</Text>
                                </View>
                            )}

                            {!txFetchingMore && txHasNextPage && (
                                <AnimatedPressable
                                    style={styles.loadMoreBtn}
                                    onPress={() => txFetchNextPage()}
                                    scaleIn={0.96}
                                >
                                    <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                                    <Text style={styles.loadMoreText}>Load More</Text>
                                </AnimatedPressable>
                            )}
                        </View>
                    )}
                </Animated.View>
            </ScrollView>


            {/* ── Top-up Modal ─────────────────────────────────────────── */}
            < Modal
                visible={showModal}
                animationType="slide"
                transparent
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={
                            topUpStep === "idle" || topUpStep === "failed"
                                ? closeModal
                                : undefined
                        }
                    />

                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />

                        {/* ── Success ── */}
                        {topUpStep === "success" ? (
                            <View style={styles.modalSuccess}>
                                <View style={styles.successCircle}>
                                    <Ionicons name="checkmark" size={40} color={Colors.white} />
                                </View>
                                <Text style={styles.successTitle}>
                                    ₹{resolvedAmount} Added!
                                </Text>
                                <Text style={styles.successSubtitle}>
                                    Your wallet has been topped up successfully.
                                </Text>
                                <AnimatedPressable
                                    style={styles.doneBtn}
                                    onPress={closeModal}
                                    scaleIn={0.96}
                                >
                                    <Text style={styles.doneBtnText}>Done</Text>
                                </AnimatedPressable>
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
                                        <AnimatedPressable
                                            key={a}
                                            style={[
                                                styles.quickChip,
                                                selectedAmount === a && styles.quickChipActive,
                                            ]}
                                            onPress={() => {
                                                setSelectedAmount(a);
                                                setCustomAmount("");
                                            }}
                                            scaleIn={0.92}
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
                                        </AnimatedPressable>
                                    ))}
                                </View>

                                {/* Custom amount */}
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

                                {/* Processing */}
                                {isProcessing && (
                                    <View style={styles.processingRow}>

                                        <Text style={styles.processingText}>
                                            {topUpStep === "creating" && "Setting up payment…"}
                                            {topUpStep === "awaiting" && "Waiting for payment…"}
                                            {topUpStep === "verifying" && "Verifying payment…"}
                                        </Text>
                                    </View>
                                )}

                                {/* CTA */}
                                <AnimatedPressable
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
                                    scaleIn={0.96}
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
                                </AnimatedPressable>

                                <Text style={styles.secureNote}>
                                    🔒 Secured by Razorpay · 100% Safe & Encrypted
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </Modal >
        </View >
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    orderPlacedCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.success + "30",
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    orderPlacedIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.success + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    orderPlacedTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: 14,
        color: Colors.text,
    },
    orderPlacedSub: {
        fontFamily: Fonts.brand,
        fontSize: 12,
        color: Colors.muted,
        marginTop: 2,
    },
    trackOrderBtn: {
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    trackOrderText: {
        color: Colors.primary, // Gold
        fontFamily: Fonts.brandBold,
        fontSize: 12,
    },
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scroll: {
        padding: 16,
        gap: 14,
        paddingBottom: 120, // Keep plenty of spacing for the floating global cart banner
    },


    // ── Balance Card ──────────────────────────────────────────────────────────
    balanceCard: {
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
        borderRadius: 20,
        padding: 20,
        overflow: "hidden",
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    circle1: {
        position: "absolute",
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: "rgba(255,255,255,0.08)",
        top: -65,
        right: -45,
    },
    circle2: {
        position: "absolute",
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: "rgba(255,255,255,0.06)",
        bottom: -35,
        left: 15,
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    cardIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    cardLabel: {
        flex: 1,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: 0.4,
    },
    cardRefreshBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    balanceAmount: {
        fontFamily: Fonts.brandBlack,
        fontSize: 40,
        color: Colors.primary, // Gold
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    cardDivider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.2)",
        marginBottom: 14,
    },
    cardFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardFooterLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    cardFooterText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: "rgba(255,255,255,0.75)",
    },
    addMoneyChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.primary, // Gold background
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    addMoneyChipText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: "#0D1B2A", // Navy text
    },

    // ── FlatList wrappers ─────────────────────────────────────────────────────
    // ── Transaction History card ──────────────────────────────────────────────
    txCard: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    txCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    txCardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    txCardIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: Colors.primaryLight ?? Colors.primary + "18",
        alignItems: "center",
        justifyContent: "center",
    },
    txCardDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginHorizontal: 0,
    },
    txInnerScroll: {
        paddingHorizontal: 16,
    },

    // ── Load more ─────────────────────────────────────────────────────────────
    loadMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        marginTop: 4,
    },
    loadMoreText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.primary,
    },

    // ── Misc (kept for compat) ─────────────────────────────────────────────────
    headerSection: {
        padding: 16,
        gap: 14,
    },
    footerSpinner: {
        marginVertical: 20,
    },

    // ── Stat Cards ────────────────────────────────────────────────────────────
    statsRow: {
        flexDirection: "row",
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        gap: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
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

    // ── Section ───────────────────────────────────────────────────────────────
    section: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        flex: 1,
    },
    countBadge: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
    },

    centerWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        justifyContent: "center",
        paddingVertical: 24,
    },
    muteText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },

    // ── Transaction list ──────────────────────────────────────────────────────
    txList: {
        gap: 0,
    },
    txRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light,
    },
    txIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    txMeta: {
        flex: 1,
        gap: 3,
        minWidth: 0,             // allow flex shrink on children
    },
    txDesc: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    txDate: {
        fontFamily: Fonts.brand,
        fontSize: 11,
        color: Colors.muted,
        flexShrink: 1,           // prevent date from wrapping
    },
    txRight: {
        alignItems: "flex-end",
        gap: 4,
        flexShrink: 0,
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

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyWrap: {
        alignItems: "center",
        paddingVertical: 28,
        gap: 8,
    },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
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
        marginTop: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    emptyAddBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: "#0D1B2A",
    },

    // ── Modal ─────────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
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

    // ── Quick amounts ─────────────────────────────────────────────────────────
    quickAmounts: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
    },
    quickChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
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

    // ── Custom amount input ───────────────────────────────────────────────────
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.background,
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

    // ── Error ─────────────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.danger + "12",
        borderColor: Colors.danger + "40",
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

    // ── Processing ────────────────────────────────────────────────────────────
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

    // ── Pay button ────────────────────────────────────────────────────────────
    payBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
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
    },

    // ── Success state ─────────────────────────────────────────────────────────
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
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
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