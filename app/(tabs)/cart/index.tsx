import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCartStore } from '@/store/useCartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { useWalletBalance } from '@/hooks/usePayments';
import { useAddresses } from '@/hooks/useAddresses';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { PaymentMode } from '@/types/orders';
import { UserAddress } from '@/types/user';
import AddressModal from '@/components/home/AddressModal';

// ─── Payment option config ────────────────────────────────────────────────────
type PaymentOption = {
    mode: PaymentMode;
    label: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;       // unique brand color from colors.ts
    colorLight: string;  // 15% alpha tint of the color
};

const PAYMENT_OPTIONS: PaymentOption[] = [
    {
        mode: 'WALLET',
        label: 'Yo Wallet',
        subtitle: 'Pay instantly from your wallet balance',
        icon: 'wallet-outline',
        color: Colors.success,         // #2ECC71 green
        colorLight: Colors.success + '20',
    },
    {
        mode: 'COD',
        label: 'Cash on Delivery',
        subtitle: 'Pay with cash when your order arrives',
        icon: 'cash-outline',
        color: Colors.secondary,       // #FFB800 amber
        colorLight: Colors.secondary + '20',
    },
    {
        mode: 'RAZORPAY',
        label: 'Razorpay',
        subtitle: 'UPI, Cards, Net Banking & more',
        icon: 'card-outline',
        color: Colors.primary,         // #E23744 red
        colorLight: Colors.primaryLight,
    },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
    const router = useRouter();
    const { items, updateQuantity, clearCart, totalAmount, restaurantId } = useCartStore();
    const createOrderMutation = useCreateOrder();

    const [selectedMode, setSelectedMode] = useState<PaymentMode>('WALLET');
    const [addressModalVisible, setAddressModalVisible] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);

    const { data: walletData, isLoading: walletLoading } = useWalletBalance();
    const { data: addresses = [] } = useAddresses();
    const walletBalance = walletData?.balance ?? 0;
    const isWalletInsufficient = selectedMode === 'WALLET' && !walletLoading && walletBalance < totalAmount;

    // Auto-select the default address on load
    useEffect(() => {
        if (addresses.length > 0 && !selectedAddress) {
            const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
            setSelectedAddress(defaultAddr);
        }
    }, [addresses]);

    // ── Checkout ──────────────────────────────────────────────────────────────
    const handleCheckout = () => {
        if (!restaurantId || items.length === 0) {
            Alert.alert('Error', 'Your cart is empty');
            return;
        }

        if (selectedMode === 'WALLET') {
            if (walletLoading) {
                Alert.alert('Please wait', 'Checking your wallet balance…');
                return;
            }
            if (walletBalance < totalAmount) {
                Alert.alert(
                    'Insufficient Wallet Balance',
                    `Your wallet has ₹${walletBalance.toFixed(2)}, but the order total is ₹${totalAmount.toFixed(2)}. Please top up or choose another method.`,
                    [
                        { text: 'Add Money', onPress: () => router.push('/wallet') },
                        { text: 'Cancel', style: 'cancel' },
                    ]
                );
                return;
            }
        }

        const payload = {
            restaurantId,
            items: items.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
            paymentMode: selectedMode,
        };

        createOrderMutation.mutate(payload, {
            onSuccess: (order) => {
                if (selectedMode === 'WALLET') {
                    clearCart();
                    router.replace('/wallet');
                } else if (selectedMode === 'COD') {
                    clearCart();
                    router.replace('/(tabs)/orders');
                } else {
                    router.push({ pathname: '/checkout', params: { orderId: order.id, amount: String(totalAmount) } });
                }
            },
            onError: (err: any) => {
                const msg =
                    err?.response?.data?.message ??
                    'Something went wrong while placing your order. Please try again.';
                Alert.alert('Order Failed', msg);
            },
        });
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                    <Ionicons name="cart-outline" size={52} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
                <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={() => router.push('/(tabs)')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.browseBtnText}>Browse Restaurants</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Order Items ─────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.itemsCard}>
                    {items.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.itemRow,
                                index < items.length - 1 && styles.itemRowBorder,
                            ]}
                        >
                            <View style={styles.itemDot} />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={styles.itemPrice}>
                                    ₹{(item.price * item.quantity).toFixed(0)}
                                </Text>
                            </View>

                            <View style={styles.qtyRow}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                    <Ionicons name="remove" size={16} color={Colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                    <Ionicons name="add" size={16} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {/* Total row inside the card */}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₹{totalAmount}</Text>
                    </View>
                </View>


                {/* ── Payment Method ──────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={styles.paymentList}>
                    {PAYMENT_OPTIONS.map((option) => {
                        const isActive = selectedMode === option.mode;
                        return (
                            <TouchableOpacity
                                key={option.mode}
                                style={[
                                    styles.paymentRow,
                                    isActive && {
                                        borderColor: option.color,
                                        backgroundColor: option.colorLight,
                                    },
                                ]}
                                onPress={() => setSelectedMode(option.mode)}
                                activeOpacity={0.75}
                            >
                                {/* Left: icon */}
                                <View
                                    style={[
                                        styles.paymentIconWrap,
                                        { backgroundColor: isActive ? option.color + '25' : Colors.surface },
                                    ]}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={20}
                                        color={isActive ? option.color : Colors.muted}
                                    />
                                </View>

                                {/* Center: text */}
                                <View style={styles.paymentTextBlock}>
                                    <Text style={styles.paymentLabel}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.paymentSubtitle}>{option.subtitle}</Text>
                                </View>

                                {/* Right: radio */}
                                <View
                                    style={[
                                        styles.radio,
                                        isActive && { borderColor: option.color },
                                    ]}
                                >
                                    {isActive && (
                                        <View
                                            style={[
                                                styles.radioDot,
                                                { backgroundColor: option.color },
                                            ]}
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Wallet Balance Banner ───────────────────────────── */}
                {selectedMode === 'WALLET' && (
                    <View
                        style={[
                            styles.walletBanner,
                            isWalletInsufficient && styles.walletBannerDanger,
                        ]}
                    >
                        <Ionicons
                            name="wallet"
                            size={18}
                            color={isWalletInsufficient ? Colors.danger : Colors.success}
                        />
                        {walletLoading ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
                        ) : (
                            <View style={styles.walletBannerContent}>
                                <Text style={styles.walletBannerLabel}>Wallet Balance</Text>
                                <Text
                                    style={[
                                        styles.walletBannerAmount,
                                        isWalletInsufficient && { color: Colors.danger },
                                    ]}
                                >
                                    ₹{walletBalance.toFixed(2)}
                                </Text>
                            </View>
                        )}
                        {isWalletInsufficient && (
                            <TouchableOpacity
                                style={styles.addMoneyBtn}
                                onPress={() => router.push('/wallet')}
                            >
                                <Ionicons name="add-circle-outline" size={14} color={Colors.white} />
                                <Text style={styles.addMoneyBtnText}>Add Money</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ── Address Modal ────────────────────────────────────────── */}
            <AddressModal
                visible={addressModalVisible}
                onClose={() => setAddressModalVisible(false)}
                addresses={addresses}
                selectedAddressId={selectedAddress?.id}
                onSelectAddress={(addr) => {
                    setSelectedAddress(addr);
                    setAddressModalVisible(false);
                }}
            />

            {/* ── Sticky Footer ───────────────────────────────────────── */}
            <View style={styles.footer}>
                {!selectedAddress ? (
                    /* ── Step 1: No address yet ── */
                    <TouchableOpacity
                        style={styles.selectAddressBtn}
                        onPress={() => setAddressModalVisible(true)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.selectAddrLeft}>
                            <View style={styles.selectAddrIconWrap}>
                                <Ionicons name="location" size={18} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.selectAddrTitle}>Select Delivery Address</Text>
                                <Text style={styles.selectAddrSub}>Where should we deliver?</Text>
                            </View>
                        </View>
                        <View style={styles.selectAddrChevron}>
                            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                        </View>
                    </TouchableOpacity>
                ) : (
                    /* ── Step 2: Address confirmed ── */
                    <>
                        {/* Address card */}
                        <TouchableOpacity
                            style={styles.confirmedAddressChip}
                            onPress={() => setAddressModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.confirmedAddrIconWrap}>
                                <Ionicons
                                    name={
                                        selectedAddress.type === 'HOME'
                                            ? 'home'
                                            : selectedAddress.type === 'WORK'
                                                ? 'briefcase'
                                                : 'location'
                                    }
                                    size={16}
                                    color={Colors.primary}
                                />
                            </View>
                            <View style={styles.confirmedAddrText}>
                                <Text style={styles.confirmedAddrType}>
                                    Delivering to {selectedAddress.type}
                                </Text>
                                <Text style={styles.confirmedAddressText} numberOfLines={1}>
                                    {selectedAddress.addressLine}
                                </Text>
                            </View>
                            <View style={styles.changeBtn}>
                                <Text style={styles.changeAddressText}>Change</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Pay button */}
                        <TouchableOpacity
                            style={[
                                styles.checkoutBtn,
                                {
                                    backgroundColor:
                                        PAYMENT_OPTIONS.find((o) => o.mode === selectedMode)?.color ??
                                        Colors.primary,
                                    shadowColor:
                                        PAYMENT_OPTIONS.find((o) => o.mode === selectedMode)?.color ??
                                        Colors.primary,
                                },
                                (createOrderMutation.isPending || isWalletInsufficient) &&
                                styles.checkoutBtnDisabled,
                            ]}
                            onPress={handleCheckout}
                            disabled={createOrderMutation.isPending || isWalletInsufficient}
                            activeOpacity={0.85}
                        >
                            {createOrderMutation.isPending ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <>
                                    {/* Left: payment icon in frosted circle */}
                                    <View style={styles.payBtnIcon}>
                                        <Ionicons
                                            name={
                                                PAYMENT_OPTIONS.find((o) => o.mode === selectedMode)?.icon ??
                                                'card-outline'
                                            }
                                            size={20}
                                            color={Colors.white}
                                        />
                                    </View>

                                    {/* Center: amount + method */}
                                    <View style={styles.payBtnCenter}>
                                        <Text style={styles.checkoutBtnText}>
                                            Pay ₹{totalAmount}
                                        </Text>
                                        <Text style={styles.checkoutBtnSub}>
                                            via {PAYMENT_OPTIONS.find((o) => o.mode === selectedMode)?.label}
                                        </Text>
                                    </View>

                                    {/* Right: lock badge */}
                                    <View style={styles.payBtnLock}>
                                        <Ionicons name="lock-closed" size={13} color={Colors.white} />
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    scroll: {
        padding: 16,
        paddingBottom: 24,
        gap: 8,
    },

    // ── Section title ─────────────────────────────────────────────────────────
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
        marginTop: 8,
    },

    // ── Items card ────────────────────────────────────────────────────────────
    itemsCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 2,
    },
    itemPrice: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    qtyBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        width: 28,
        textAlign: 'center',
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: 4,
    },
    totalLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    totalValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.primary,
    },

    // ── Payment list ──────────────────────────────────────────────────────────
    paymentList: {
        gap: 10,
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        gap: 12,
    },
    paymentIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentTextBlock: {
        flex: 1,
        gap: 2,
    },
    paymentLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    paymentSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 16,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },

    // ── Wallet balance banner ─────────────────────────────────────────────────
    walletBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.success + '15',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.success + '40',
        marginTop: 4,
    },
    walletBannerDanger: {
        backgroundColor: Colors.danger + '10',
        borderColor: Colors.danger + '40',
    },
    walletBannerContent: {
        flex: 1,
    },
    walletBannerLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    walletBannerAmount: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.success,
    },
    addMoneyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.danger,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addMoneyBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },

    // ── Footer: select address button ─────────────────────────────────────
    selectAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderWidth: 2,
        borderColor: Colors.primary + '40',
        borderStyle: 'dashed',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        gap: 12,
    },
    selectAddrLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    selectAddrIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 11,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectAddrTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    selectAddrSub: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 1,
    },
    selectAddrChevron: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Footer: confirmed address card ─────────────────────────────────
    confirmedAddressChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.primaryLight,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
    },
    confirmedAddrIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    confirmedAddrText: {
        flex: 1,
        gap: 2,
    },
    confirmedAddrType: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    confirmedAddressText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    changeBtn: {
        backgroundColor: Colors.primary + '18',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    changeAddressText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
        padding: 16,
        paddingBottom: 28,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },

    // ── Pay button ─────────────────────────────────────────────────────────────
    checkoutBtn: {
        flexDirection: 'row',

        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 7,
    },
    checkoutBtnDisabled: {
        opacity: 0.5,
    },
    payBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    payBtnCenter: {
        flex: 1,
        alignItems: 'center',
    },
    payBtnLock: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    checkoutBtnText: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.white,
        letterSpacing: 0.2,
    },
    checkoutBtnSub: {
        fontFamily: Fonts.brandMedium,
        fontSize: 11,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 1,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: Colors.white,
        gap: 10,
    },
    emptyIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xl,
        color: Colors.text,
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
    },
    browseBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 100,
        marginTop: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    browseBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.white,
    },
});