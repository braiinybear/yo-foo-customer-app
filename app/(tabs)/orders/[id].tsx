import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { useOrderDetail } from '@/hooks/useOrders';
import { useOrderRealTimeUpdate } from '@/hooks/useOrderRealTimeUpdate';
import { useOrderTracking, useSocketOrders } from '@/hooks/useSocketOrders';
import { useSocketStore } from '@/store/useSocketStore';
import { CustomerOrderProgressBar } from '@/components/CustomerOrderProgressBar';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { OrderStatus } from '@/types/orders';

// ─── Status config ────────────────────────────────────────────────────────────
function statusConfig(status: OrderStatus) {
    switch (status) {
        case 'PLACED':
            return { color: '#1565C0', bg: '#E3F2FD', icon: 'time-outline' as const, label: 'Order Placed' };
        case 'CONFIRMED':
            return { color: '#6A1B9A', bg: '#F3E5F5', icon: 'checkmark-done-outline' as const, label: 'Confirmed' };
        case 'PREPARING':
            return { color: '#E65100', bg: '#FFF3E0', icon: 'restaurant-outline' as const, label: 'Preparing' };
        case 'ON_THE_WAY':
            return { color: '#00838F', bg: '#E0F7FA', icon: 'bicycle-outline' as const, label: 'On the Way' };
        case 'DELIVERED':
            return { color: '#2E7D32', bg: '#E8F5E9', icon: 'checkmark-circle-outline' as const, label: 'Delivered' };
        case 'CANCELLED':
            return { color: '#C62828', bg: '#FFEBEE', icon: 'close-circle-outline' as const, label: 'Cancelled' };
        default:
            return { color: Colors.muted, bg: Colors.surface, icon: 'ellipsis-horizontal-outline' as const, label: status };
    }
}

// ─── Payment mode label ───────────────────────────────────────────────────────
function paymentLabel(mode: string) {
    const map: Record<string, string> = {
        COD: 'Cash on Delivery',
        WALLET: 'Yo Wallet',
        RAZORPAY: 'Razorpay',
        UPI: 'UPI',
        CARD: 'Card',
        NETBANKING: 'Net Banking',
    };
    return map[mode] ?? mode;
}

function paymentIcon(mode: string): keyof typeof Ionicons.glyphMap {
    switch (mode) {
        case 'WALLET': return 'wallet-outline';
        case 'COD': return 'cash-outline';
        case 'RAZORPAY':
        case 'CARD': return 'card-outline';
        default: return 'phone-portrait-outline';
    }
}

// ─── Row helpers ──────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
);

const SectionCard = ({ title, icon, children }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
}) => (
    <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: order, isLoading, isError, refetch } = useOrderDetail(id ?? '');
    
    // ✅ Register socket event listeners (new_order, order_status_update, driver_assigned)
    useSocketOrders();
    
    // ✅ Join/leave socket room for this specific order
    useOrderTracking(id ?? null);
    
    // ✅ Subscribe to real-time status updates with fallback polling
    const { realTimeStatus, isUpdating, isFallbackPolling, connectionStatus } = useOrderRealTimeUpdate(id);

    // Map & Location Tracking States
    const driverLocation = useSocketStore((state) => state.driverLocation);
    const mapRef = useRef<MapView>(null);
    const [userLocLatLng, setUserLocLatLng] = useState<{lat: number, lng: number} | null>(null);

    // Request GPS permission so the map represents the customer natively
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let currentLoc = await Location.getCurrentPositionAsync({});
            setUserLocLatLng({ lat: currentLoc.coords.latitude, lng: currentLoc.coords.longitude });
        })();
    }, []);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading order details…</Text>
            </View>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (isError || !order) {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color={Colors.muted} />
                <Text style={styles.errorText}>Could not load order details</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const displayStatus: OrderStatus = (realTimeStatus as OrderStatus) || order.status;
    const showDeliveryOtp = !!order.otp && ['PICKED_UP', 'ON_THE_WAY'].includes(displayStatus);
    const sc = statusConfig(displayStatus);
    const placedDate = new Date(order.placedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const showMap = ['ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY'].includes(displayStatus);

    // Map auto-fit coordinates logic
    if (showMap && mapRef.current) {
        const coords = [];
        if (order.restaurant) coords.push({ latitude: order.restaurant.lat, longitude: order.restaurant.lng });
        if (driverLocation) coords.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
        if (userLocLatLng) coords.push({ latitude: userLocLatLng.lat, longitude: userLocLatLng.lng });

        if (coords.length > 1) {
            mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }

    return (
        <View style={styles.root}>
            {showMap && order.restaurant && (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFillObject}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        initialRegion={{
                            latitude: order.restaurant.lat,
                            longitude: order.restaurant.lng,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {/* Restaurant Marker (Dimmed if Picked Up) */}
                        {displayStatus !== 'ON_THE_WAY' && (
                            <Marker
                                coordinate={{ latitude: order.restaurant.lat, longitude: order.restaurant.lng }}
                                title={order.restaurant.name}
                                description="Restaurant"
                            >
                                <View style={styles.markerCircleRest}>
                                    <Ionicons name="restaurant" size={16} color="#FFF" />
                                </View>
                            </Marker>
                        )}
                        
                        {/* Driver Marker (Animated live from sockets) */}
                        {driverLocation && (
                            <Marker
                                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                                title={order.driver?.name || "Your Driver"}
                                description={displayStatus.replace('_', ' ')}
                            >
                                <View style={styles.markerCircleDriver}>
                                    <Ionicons name="bicycle" size={18} color="#FFF" />
                                </View>
                            </Marker>
                        )}

                        {/* Custom User Location Marker */}
                        {userLocLatLng && (
                            <Marker
                                coordinate={{ latitude: userLocLatLng.lat, longitude: userLocLatLng.lng }}
                                title="You"
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={styles.userMarker}>
                                    <View style={styles.userMarkerDot} />
                                </View>
                            </Marker>
                        )}
                    </MapView>
                </View>
            )}

            <ScrollView
                style={styles.scrollViewContainer}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Status Banner ────────────────────────────────────── */}
                <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
                    <View style={[styles.statusIconCircle, { backgroundColor: sc.color + '22' }]}>
                        <Ionicons name={sc.icon} size={28} color={sc.color} />
                    </View>
                    <View style={styles.statusTextBlock}>
                        <View style={styles.statusLabelRow}>
                            <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
                            {isUpdating && (
                                <View style={styles.updateBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                    <Text style={styles.updateBadgeText}>Updated</Text>
                                </View>
                            )}
                            {isFallbackPolling && connectionStatus === 'polling' && (
                                <View style={styles.pollingBadge}>
                                    <Ionicons name="reload-circle" size={16} color={Colors.warning} />
                                    <Text style={styles.pollingBadgeText}>Polling</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.statusOrderId} numberOfLines={1}>
                            #{order.id.slice(-10).toUpperCase()}
                        </Text>
                        <Text style={styles.statusDate}>{placedDate}</Text>
                    </View>
                </View>

                {/* ── ORDER PROGRESS BAR ──────────────────────────────── */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
                  <CustomerOrderProgressBar
                    status={displayStatus}
                    size="large"
                  />
                </View>

                {showDeliveryOtp && (
                    <SectionCard title="Delivery OTP" icon="key-outline">
                        <Text style={styles.otpValue}>{order.otp}</Text>
                        <Text style={styles.otpHint}>
                            Share this OTP with your rider only after the order reaches you.
                        </Text>
                    </SectionCard>
                )}

                {/* ── Driver ───────────────────────────────────────────── */}
                {order.driver && (
                    <SectionCard title="Delivery Partner" icon="bicycle-outline">
                        <View style={styles.driverRow}>
                            <View style={styles.driverAvatar}>
                                <Ionicons name="person" size={22} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.driverName}>{order.driver.name}</Text>
                                <Text style={styles.driverPhone}>{order.driver.phone}</Text>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {/* ── Restaurant ───────────────────────────────────────── */}
                <SectionCard title="Restaurant" icon="restaurant-outline">
                    <Text style={styles.restName}>{order.restaurant.name}</Text>
                    {order.restaurant.description && (
                        <Text style={styles.restDesc}>{order.restaurant.description}</Text>
                    )}
                    <View style={styles.restMeta}>
                        <Ionicons name="location-outline" size={13} color={Colors.muted} />
                        <Text style={styles.restMetaText}>{order.restaurant.address}</Text>
                    </View>
                    {order.restaurant.cuisineTypes.length > 0 && (
                        <View style={styles.cuisineRow}>
                            {order.restaurant.cuisineTypes.map((c) => (
                                <View key={c} style={styles.cuisineChip}>
                                    <Text style={styles.cuisineChipText}>{c}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </SectionCard>

                {/* ── Items ────────────────────────────────────────────── */}
                <SectionCard title="Order Items" icon="bag-outline">
                    {order.items.map((item, idx) => (
                        <View
                            key={item.id}
                            style={[
                                styles.itemRow,
                                idx < order.items.length - 1 && styles.itemRowBorder,
                            ]}
                        >
                            {/* Veg / Non-veg dot */}
                            <View
                                style={[
                                    styles.vegDot,
                                    {
                                        backgroundColor:
                                            item.menuItem.type === 'VEG'
                                                ? Colors.success
                                                : Colors.danger,
                                    },
                                ]}
                            />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                                {item.menuItem.description && (
                                    <Text style={styles.itemDesc} numberOfLines={1}>
                                        {item.menuItem.description}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.itemRight}>
                                <Text style={styles.itemQty}>×{item.quantity}</Text>
                                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                            </View>
                        </View>
                    ))}
                </SectionCard>

                {/* ── Bill Summary ─────────────────────────────────────── */}
                <SectionCard title="Bill Summary" icon="receipt-outline">
                    <InfoRow label="Item Total" value={`₹${order.itemTotal}`} />
                    <InfoRow label="GST & Taxes" value={`₹${order.tax}`} />
                    <InfoRow label="Delivery Charge" value={`₹${order.deliveryCharge}`} />
                    <InfoRow label="Platform Fee" value={`₹${order.platformFee}`} />
                    {order.driverTip > 0 && (
                        <InfoRow label="Driver Tip" value={`₹${order.driverTip}`} />
                    )}
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
                    </View>
                </SectionCard>

                {/* ── Payment ──────────────────────────────────────────── */}
                <SectionCard title="Payment" icon="card-outline">
                    <View style={styles.paymentRow}>
                        <View style={styles.paymentIconWrap}>
                            <Ionicons
                                name={paymentIcon(order.paymentMode)}
                                size={20}
                                color={Colors.primary}
                            />
                        </View>
                        <View style={styles.paymentTextBlock}>
                            <Text style={styles.paymentMode}>{paymentLabel(order.paymentMode)}</Text>
                            <Text style={styles.paymentStatus}>
                                {order.isPaid ? '✓ Payment Received' : 'Payment Pending'}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.paidBadge,
                                { backgroundColor: order.isPaid ? Colors.success + '18' : Colors.warning + '20' },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.paidBadgeText,
                                    { color: order.isPaid ? Colors.success : Colors.warning },
                                ]}
                            >
                                {order.isPaid ? 'PAID' : 'PENDING'}
                            </Text>
                        </View>
                    </View>
                </SectionCard>

                {/* ── Cancellation Reason ───────────────────────────────── */}
                {order.cancellationReason && (
                    <SectionCard title="Cancellation Reason" icon="information-circle-outline">
                        <Text style={styles.cancelReason}>{order.cancellationReason}</Text>
                    </SectionCard>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    mapContainer: {
        height: '35%',
        width: '100%',
        backgroundColor: '#EBEBEB',
    },
    scrollViewContainer: {
        flex: 1,
    },
    markerCircleRest: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E65100',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 4,
    },
    markerCircleDriver: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#00838F',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 4,
    },
    scroll: {
        padding: 16,
        gap: 12,
        paddingBottom: 32,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.white,
        padding: 24,
    },
    loadingText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginTop: 8,
    },
    errorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.muted,
    },
    retryBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 4,
    },
    retryBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.white,
    },

    // ── Status Banner ──────────────────────────────────────────────────────
    statusBanner: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    statusIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statusTextBlock: {
        flex: 1,
        gap: 3,
    },
    statusLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    statusLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        flex: 1,
    },
    statusOrderId: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        letterSpacing: 0.5,
    },
    statusDate: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    updateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: Colors.success + '15',
        borderRadius: 6,
    },
    updateBadgeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.success,
    },
    pollingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: Colors.warning + '18',
        borderRadius: 6,
    },
    pollingBadgeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.warning,
    },
    otpValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: 32,
        color: Colors.primary,
        letterSpacing: 8,
    },
    otpHint: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
    },

    // ── Section Card ───────────────────────────────────────────────────────
    sectionCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
    },

    // ── Restaurant ─────────────────────────────────────────────────────────
    restName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    restDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        lineHeight: 20,
    },
    restMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    restMetaText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        flex: 1,
    },
    cuisineRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    cuisineChip: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    cuisineChipText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 11,
        color: Colors.textSecondary,
    },

    // ── Items ──────────────────────────────────────────────────────────────
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    vegDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    itemDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    itemRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    itemQty: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    itemPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },

    // ── Bill ───────────────────────────────────────────────────────────────
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoLabel: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    infoValue: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 6,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 2,
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

    // ── Payment ────────────────────────────────────────────────────────────
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentTextBlock: {
        flex: 1,
        gap: 2,
    },
    paymentMode: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    paymentStatus: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    paidBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    paidBadgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
    },

    // ── Driver ─────────────────────────────────────────────────────────────
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    driverAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    driverPhone: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },

    // ── Cancellation ───────────────────────────────────────────────────────
    cancelReason: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.danger,
        lineHeight: 20,
    },

    // ── User Location Marker ──────────────────────────────────────────────
    userMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4285F4',
        borderWidth: 2,
        borderColor: '#FFF',
    },
});
