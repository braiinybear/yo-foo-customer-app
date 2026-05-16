import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from "@/context/ThemeContext";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Image,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCartStore } from '@/store/useCartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { useWalletBalance } from '@/hooks/usePayments';
import { useAddresses } from '@/hooks/useAddresses';
// import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { getPlaceholderImage } from '@/constants/images';
import { PaymentMode } from '@/types/orders';
import { UserAddress } from '@/types/user';
import AddressModal from '@/components/home/AddressModal';
import { showAlert } from '@/store/useAlertStore';
import Animated, { FadeInDown, LinearTransition, SlideOutDown } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/AnimatedPressable';

// ─── Payment option config ────────────────────────────────────────────────────
type PaymentOption = {
    mode: PaymentMode;
    label: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;       // unique brand color from colors.ts
    colorLight: string;  // 15% alpha tint of the color
};

// Payment options moved inside component for theme reactivity

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const router = useRouter();

    const PAYMENT_OPTIONS: PaymentOption[] = [
        {
            mode: 'WALLET',
            label: 'Wallet',
            subtitle: 'Pay instantly from your wallet balance',
            icon: 'wallet-outline',
            color: Colors.success,
            colorLight: Colors.success + '20',
        },
        {
            mode: 'COD',
            label: 'Cash on Delivery',
            subtitle: 'Pay with cash when your order arrives',
            icon: 'cash-outline',
            color: Colors.secondary,
            colorLight: Colors.secondary + '20',
        },
        {
            mode: 'RAZORPAY',
            label: 'Online',
            subtitle: 'UPI, Cards, Net Banking & more',
            icon: 'card-outline',
            color: isDark ? Colors.primary : Colors.primary,
            colorLight: Colors.primaryLight,
        },
    ];
    const { items, updateQuantity, clearCart, totalAmount, restaurantId } = useCartStore();
    const createOrderMutation = useCreateOrder();

    const [selectedMode, setSelectedMode] = useState<PaymentMode>('WALLET');
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
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
    }, [addresses, selectedAddress]);

    // ── Checkout ──────────────────────────────────────────────────────────────
    const handleCheckout = () => {
        if (!restaurantId || items.length === 0) {
            showAlert('Error', 'Your cart is empty');
            return;
        }

        if (selectedMode === 'WALLET') {
            if (walletLoading) {
                showAlert('Please wait', 'Checking your wallet balance…');
                return;
            }
            if (walletBalance < totalAmount) {
                showAlert(
                    'Insufficient Wallet Balance',
                    `Your wallet has ₹${walletBalance.toFixed(2)}, but the order total is ₹${totalAmount.toFixed(2)}. Please top up or choose another method.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Add Money', onPress: () => router.push('/wallet') },
                    ]
                );
                return;
            }
        }

        const payload = {
            restaurantId,
            items: items.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
            paymentMode: selectedMode,
            addressId: selectedAddress?.id,
        };

        createOrderMutation.mutate(payload, {
            onSuccess: (order) => {
                if (selectedMode === 'WALLET') {
                    clearCart();
                    router.replace({
                        pathname: '/wallet',
                        params: { orderId: order.id }
                    });
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
                showAlert('Order Failed', msg);
            },
        });
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: Colors.secondary + '12' }]}>
                    <Ionicons name="cart-outline" size={52} color={Colors.secondary} />
                </View>
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
                <AnimatedPressable
                    style={styles.browseBtn}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={styles.browseBtnText}>Browse Restaurants</Text>
                </AnimatedPressable>
            </Animated.View>
        );
    }


    return (
        <View style={styles.root}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                decelerationRate="normal"
            >
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.itemsCard}>
                        {items.map((item, index) => (
                            <Animated.View
                                key={item.id}
                                layout={LinearTransition.springify()}
                                exiting={SlideOutDown.duration(200)}
                                style={[
                                    styles.itemRow,
                                    index < items.length - 1 && styles.itemRowBorder,
                                ]}
                            >
                                <Image
                                    source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                                    style={styles.cartItemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.itemPrice}>
                                        ₹{(item.price * item.quantity).toFixed(0)}
                                    </Text>
                                </View>

                                <View style={styles.qtyRow}>
                                    <AnimatedPressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                                        scaleIn={0.8}
                                    >
                                        <Ionicons name="remove" size={16} color={Colors.primary} />
                                    </AnimatedPressable>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <AnimatedPressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                                        scaleIn={0.8}
                                        >
                                        <Ionicons name="add" size={16} color={Colors.primary} />
                                    </AnimatedPressable>
                                </View>
                            </Animated.View>
                        ))}

                        {/* Total row inside the card */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₹{totalAmount}</Text>
                        </View>
                    </View>
                </Animated.View>


                {/* ── Payment Method ──────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <AnimatedPressable
                        style={styles.paymentDropdownBtn}
                        onPress={() => setPaymentModalVisible(true)}
                        scaleIn={0.98}
                    >
                        {(() => {
                            const selected = PAYMENT_OPTIONS.find(o => o.mode === selectedMode);
                            return (
                                <>
                                    <View style={styles.paymentDropdownContent}>
                                        <Text style={styles.paymentDropdownLabel}>{selected?.label}</Text>
                                        <Text style={styles.paymentDropdownSub}>{selected?.subtitle}</Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color={Colors.muted}
                                    />
                                </>
                            );
                        })()}
                    </AnimatedPressable>
                </Animated.View>

                {/* Payment Method Modal */}
                <Modal
                    visible={paymentModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setPaymentModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Payment Method</Text>
                                <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                                    <Ionicons name="close" size={28} color={Colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Payment Options */}
                            <ScrollView
                                style={styles.modalBody}
                                scrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {PAYMENT_OPTIONS.map((option) => (
                                    <AnimatedPressable
                                        key={option.mode}
                                        style={[
                                            styles.paymentModalOption,
                                            selectedMode === option.mode && styles.paymentModalOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedMode(option.mode);
                                            setPaymentModalVisible(false);
                                        }}
                                        scaleIn={0.97}
                                    >
                                        <View
                                            style={[
                                                styles.paymentIconWrap,
                                                { backgroundColor: option.colorLight }
                                            ]}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={24}
                                                color={option.color}
                                            />
                                        </View>
                                        <View style={styles.paymentModalContent}>
                                            <Text style={styles.paymentIconLabel}>{option.label}</Text>
                                            <Text style={styles.paymentIconSub}>{option.subtitle}</Text>
                                        </View>
                                        {selectedMode === option.mode && (
                                            <View style={styles.checkmarkBadge}>
                                                <Ionicons name="checkmark" size={18} color={Colors.white} />
                                            </View>
                                        )}
                                    </AnimatedPressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* ── Wallet Balance Indicator ───────────────────────── */}
                {selectedMode === 'WALLET' && (
                    <Animated.View entering={FadeInDown} style={styles.walletIndicator}>
                        {walletLoading ? (
                            <ActivityIndicator size="small" color={Colors.success} />
                        ) : (
                            <>
                                <Text style={[styles.walletIndicatorText, isWalletInsufficient && { color: Colors.danger }]}>
                                    Balance: ₹{walletBalance.toFixed(2)}
                                </Text>
                                {isWalletInsufficient && (
                                    <AnimatedPressable
                                        style={styles.addMoneyBtnSmall}
                                        onPress={() => router.push('/wallet')}
                                        scaleIn={0.9}
                                    >
                                        <Text style={styles.addMoneyBtnSmallText}>Add Money</Text>
                                    </AnimatedPressable>
                                )}
                            </>
                        )}
                    </Animated.View>
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
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.footer}>
                {!selectedAddress ? (
                    /* ── Step 1: No address yet ── */
                    <AnimatedPressable
                        style={styles.selectAddressBtn}
                        onPress={() => setAddressModalVisible(true)}
                        scaleIn={0.98}
                    >
                        <View style={styles.selectAddrLeft}>
                            <View style={styles.selectAddrIconWrap}>
                                <Ionicons name="location" size={18} color={Colors.text} />
                            </View>
                            <View>
                                <Text style={styles.selectAddrTitle}>Select Delivery Address</Text>
                                <Text style={styles.selectAddrSub}>Where should we deliver?</Text>
                            </View>
                        </View>
                        <View style={styles.selectAddrChevron}>
                            <Ionicons name="chevron-forward" size={18} color={Colors.text} />
                        </View>
                    </AnimatedPressable>
                ) : (
                    /* ── Step 2: Address confirmed ── */
                    <>
                        {/* Address card */}
                        <AnimatedPressable
                            style={styles.confirmedAddressChip}
                            onPress={() => setAddressModalVisible(true)}
                            scaleIn={0.98}
                        >
                            <View style={styles.addressContent}>
                                <Text style={styles.confirmedAddrType}>
                                    {selectedAddress.type === 'HOME' ? '🏠 Home' : selectedAddress.type === 'WORK' ? '💼 Work' : '📍 Other'}
                                </Text>
                                <Text style={styles.confirmedAddressText} numberOfLines={2}>
                                    {selectedAddress.addressLine}
                                </Text>
                            </View>
                            <AnimatedPressable
                                style={styles.changeBtn}
                                onPress={() => setAddressModalVisible(true)}
                                scaleIn={0.85}
                            >
                                <Text style={styles.changeAddressText}>Change</Text>
                            </AnimatedPressable>
                        </AnimatedPressable>

                        {/* Pay button */}
                        <AnimatedPressable
                            style={[
                                styles.checkoutBtn,
                                {
                                    backgroundColor: Colors.secondary, // Midnight Navy
                                    shadowColor: Colors.secondary,
                                },
                                (createOrderMutation.isPending || isWalletInsufficient) &&
                                styles.checkoutBtnDisabled,
                            ]}
                            onPress={handleCheckout}
                            disabled={createOrderMutation.isPending || isWalletInsufficient}
                        >
                            {createOrderMutation.isPending ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <View style={styles.payBtnContent}>
                                    <Ionicons name="cash-outline" size={17} color={Colors.primary} style={styles.payBtnIcon} />
                                    <Text style={styles.checkoutBtnText}>
                                        Pay ₹{totalAmount}
                                    </Text>
                                </View>
                            )}
                        </AnimatedPressable>
                    </>
                )}
            </Animated.View>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
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
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
        marginTop: 8,
    },

    // ── Items card ────────────────────────────────────────────────────────────
    itemsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        paddingHorizontal: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
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
    cartItemImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        resizeMode: 'cover',
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
        backgroundColor: Colors.text + '10',
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

    // ── Payment dropdown ──────────────────────────────────────────────────────────
    paymentDropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        gap: 12,
        justifyContent: 'space-between',
    },
    checkmarkBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentDropdownContent: {
        flex: 1,
        gap: 3,
    },
    paymentDropdownLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        letterSpacing: 0.3,
    },
    paymentDropdownSub: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 14,
    },
    paymentIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentIconLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        letterSpacing: 0.3,
    },
    paymentIconSub: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 14,
    },
    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    modalBody: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    paymentModalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 14,
        marginVertical: 8,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.border,
        gap: 14,
    },
    paymentModalOptionSelected: {
        borderColor: Colors.primary,
        borderWidth: 2,
        backgroundColor: Colors.primary + '10',
    },
    paymentModalContent: {
        flex: 1,
        gap: 3,
    },

    // ── Wallet balance indicator (small text) ──────────────────────────────
    walletIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 0,
        marginTop: 2,
    },
    walletIndicatorText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.success,
    },
    addMoneyBtnSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    addMoneyBtnSmallText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.danger,
        textDecorationLine: 'underline',
    },

    // ── Footer: select address button ─────────────────────────────────────
    selectAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.text + '06',
        borderWidth: 1,
        borderColor: Colors.text + '12',
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
        backgroundColor: Colors.text + '08',
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
        backgroundColor: Colors.text + '08',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Footer: confirmed address card ─────────────────────────────────
    confirmedAddressChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: Colors.text + '15',
    },
    addressContent: {
        flex: 1,
        gap: 4,
    },
    confirmedAddrType: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    confirmedAddressText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 16,
    },
    changeBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
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
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },

    // ── Pay button ─────────────────────────────────────────────────────────────
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    checkoutBtnDisabled: {
        opacity: 0.6,
    },
    payBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    payBtnIcon: {
        marginRight: 4,
    },
    checkoutBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary, // Gold
        letterSpacing: 0.3,
    },
    checkoutBtnSub: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.white + '85',
        marginTop: 2,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: Colors.surface,
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