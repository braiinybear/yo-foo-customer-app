import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTheme } from "@/context/ThemeContext";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    Linking,
    Animated,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MapView, { Marker, Polyline, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { useOrderDetail } from '@/hooks/useOrders';
import { useOrderRealTimeUpdate } from '@/hooks/useOrderRealTimeUpdate';
import { useOrderTracking, useSocketOrders } from '@/hooks/useSocketOrders';
import { useSocketStore } from '@/store/useSocketStore';
import { useSubmitReview } from '@/hooks/useReview';
import { CustomerOrderProgressBar } from '@/components/CustomerOrderProgressBar';
// import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { OrderStatus } from '@/types/orders';
import LoadingLottie from '@/components/LoadingLottie';

// ─── Premium Google Maps Styles ──────────────────────────────────────────────
const MAP_STYLE_LIGHT = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const MAP_STYLE_DARK = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// ─── Haversine ETA calculator (no Google billing needed) ──────────────────────
function calculateETA(
    driverLat: number, driverLng: number,
    destLat: number, destLng: number,
    avgSpeedKmh: number = 25 // average city driving speed
): { distanceKm: number; etaMinutes: number } {
    const R = 6371;
    const dLat = (destLat - driverLat) * Math.PI / 180;
    const dLon = (destLng - driverLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(driverLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    // Road distance is ~1.4x straight line
    const roadDistance = distanceKm * 1.4;
    const etaMinutes = Math.max(2, Math.round((roadDistance / avgSpeedKmh) * 60));
    return { distanceKm: parseFloat(roadDistance.toFixed(1)), etaMinutes };
}

// ─── Status config ────────────────────────────────────────────────────────────
// ─── Status config ────────────────────────────────────────────────────────────
function statusConfig(status: OrderStatus, isDark: boolean, Colors: any) {
    if (isDark) {
        switch (status) {
            case 'PLACED': return { color: '#64B5F6', bg: 'rgba(21, 101, 192, 0.2)', icon: 'time-outline' as const, label: 'Order Placed' };
            case 'CONFIRMED': return { color: '#BA68C8', bg: 'rgba(106, 27, 154, 0.2)', icon: 'checkmark-done-outline' as const, label: 'Confirmed' };
            case 'PREPARING': return { color: '#FFB74D', bg: 'rgba(230, 81, 0, 0.2)', icon: 'restaurant-outline' as const, label: 'Preparing' };
            case 'ON_THE_WAY': return { color: '#4DD0E1', bg: 'rgba(0, 131, 143, 0.2)', icon: 'bicycle-outline' as const, label: 'On the Way' };
            case 'DELIVERED': return { color: '#81C784', bg: 'rgba(46, 125, 50, 0.2)', icon: 'checkmark-circle-outline' as const, label: 'Delivered' };
            case 'CANCELLED': return { color: '#E57373', bg: 'rgba(198, 40, 40, 0.2)', icon: 'close-circle-outline' as const, label: 'Cancelled' };
            default: return { color: Colors.muted, bg: Colors.surface, icon: 'ellipsis-horizontal-outline' as const, label: status };
        }
    }
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
const InfoRow = ({ label, value, valueColor, styles }: { label: string; value: string; valueColor?: string; styles: any }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
);

const SectionCard = ({ title, icon, children, Colors, styles }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
    Colors: any;
    styles: any;
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
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const { id, openReview } = useLocalSearchParams<{ id: string; openReview?: string }>();
    const { data: order, isLoading, isError, refetch } = useOrderDetail(id ?? '');



    // ✅ Register socket event listeners (new_order, order_status_update, driver_assigned)
    useSocketOrders();

    // ✅ Join/leave socket room for this specific order
    useOrderTracking(id ?? null);

    // ✅ Subscribe to real-time status updates with fallback polling
    const { realTimeStatus, isUpdating, isFallbackPolling, connectionStatus } = useOrderRealTimeUpdate(id);

    // ─── ETA state ────────────────────────────────────────────────────────────
    const [eta, setEta] = useState<{ distanceKm: number; etaMinutes: number } | null>(null);
    const [etaPulse] = useState(() => new Animated.Value(1));
    const prevStatusRef = useRef<string | null>(null);

    // ─── Review Modal State ────────────────────────────────────────────────────
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [foodRating, setFoodRating] = useState(0);
    const [deliveryRating, setDeliveryRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const { mutate: submitReview, isPending: isSubmittingReview } = useSubmitReview();
    const reviewModalRef = useRef<View>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // ─── Auto-open review modal from deep link ─────────────────────────────────
    useEffect(() => {
        if (openReview === 'true' && order && !order.review) {
            setShowReviewModal(true);
        }
    }, [openReview, order]);

    // Map & Location Tracking States
    const driverLocation = useSocketStore((state) =>
        state.driverLocation?.orderId === id ? state.driverLocation : null
    );
    const mapRef = useRef<MapView>(null);
    const driverMarkerRef = useRef<any>(null);
    const [userLocLatLng, setUserLocLatLng] = useState<{ lat: number, lng: number } | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    const GOOGLE_MAPS_APIKEY = process.env.GOOGLE_MAPS_API_KEY || '';
    const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

    const displayDriverLocation = useMemo(() => {
        if (driverLocation) return driverLocation;
        if (order?.driver?.currentLat != null && order?.driver?.currentLng != null) {
            return { lat: order.driver.currentLat, lng: order.driver.currentLng };
        }
        if (order?.restaurant) {
            return { lat: order.restaurant.lat, lng: order.restaurant.lng };
        }
        return null;
    }, [driverLocation, order?.driver, order?.restaurant]);

    const [animatedDriverLocation] = useState(() => new AnimatedRegion({
        latitude: displayDriverLocation?.lat || 0,
        longitude: displayDriverLocation?.lng || 0,
        latitudeDelta: 0,
        longitudeDelta: 0,
    }));

    useEffect(() => {
        if (displayDriverLocation?.lat != null && displayDriverLocation?.lng != null) {
            const newCoordinate = {
                latitude: displayDriverLocation.lat,
                longitude: displayDriverLocation.lng,
            };
            if (Platform.OS === 'android') {
                if (driverMarkerRef.current) {
                    driverMarkerRef.current.animateMarkerToCoordinate(newCoordinate, 2000);
                }
            } else {
                animatedDriverLocation.timing({
                    latitude: newCoordinate.latitude,
                    longitude: newCoordinate.longitude,
                    latitudeDelta: 0,
                    longitudeDelta: 0,
                    duration: 2000,
                    useNativeDriver: false,
                } as any).start();
            }
        }
    }, [displayDriverLocation?.lat, displayDriverLocation?.lng, animatedDriverLocation]);

    // ─── Haptic feedback on status change ─────────────────────────────────────
    useEffect(() => {
        if (realTimeStatus && prevStatusRef.current && realTimeStatus !== prevStatusRef.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        prevStatusRef.current = realTimeStatus;
    }, [realTimeStatus]);

    const destination = useMemo(() => {
        if (order?.customerAddress) return { lat: order.customerAddress.lat, lng: order.customerAddress.lng };
        return userLocLatLng;
    }, [order?.customerAddress, userLocLatLng]);

    // ─── ETA calculation (updates as driver moves) ────────────────────────────
    useEffect(() => {
        if (!displayDriverLocation || !destination) {
            setEta(null);
            return;
        }
        const result = calculateETA(
            displayDriverLocation.lat, displayDriverLocation.lng,
            destination.lat, destination.lng
        );
        setEta(result);

        // Pulse animation on ETA update
        Animated.sequence([
            Animated.timing(etaPulse, { toValue: 1.05, duration: 200, useNativeDriver: true }),
            Animated.timing(etaPulse, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [displayDriverLocation?.lat, displayDriverLocation?.lng, destination?.lat, destination?.lng, etaPulse]);

    const fetchRoute = useCallback(async (
        origin: { latitude: number; longitude: number; },
        dest: { latitude: number; longitude: number; }
    ) => {
        const decodePoly = (encoded: string) => {
            const points: { latitude: number; longitude: number }[] = [];
            let index = 0, lat = 0, lng = 0;
            while (index < encoded.length) {
                let b, shift = 0, result = 0;
                do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
                const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
                shift = 0; result = 0;
                do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
                const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
                points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
            }
            return points;
        };

        try {
            if (GOOGLE_MAPS_APIKEY) {
                const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&mode=driving&key=${GOOGLE_MAPS_APIKEY}`;
                const res = await fetch(url);
                const json = await res.json();
                if (json.routes?.length > 0) {
                    setRouteCoords(decodePoly(json.routes[0].overview_polyline.points));
                    return;
                }
            }

            // Fallback to free OSRM routing if Google API is missing or fails
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=polyline`;
            const osrmRes = await fetch(osrmUrl);
            const osrmJson = await osrmRes.json();

            if (osrmJson.routes?.length > 0) {
                setRouteCoords(decodePoly(osrmJson.routes[0].geometry));
            } else {
                setRouteCoords([origin, dest]); // Ultimate fallback
            }
        } catch (err) {
            setRouteCoords([origin, dest]);
        }
    }, [GOOGLE_MAPS_APIKEY]);

    useEffect(() => {
        if (destination && displayDriverLocation) {
            const originObj = { latitude: displayDriverLocation.lat, longitude: displayDriverLocation.lng };
            fetchRoute(originObj, { latitude: destination.lat, longitude: destination.lng });
        }
    }, [displayDriverLocation?.lat, displayDriverLocation?.lng, destination?.lat, destination?.lng, fetchRoute]);

    // Request GPS permission so the map represents the customer natively
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let currentLoc = await Location.getCurrentPositionAsync({});
            setUserLocLatLng({ lat: currentLoc.coords.latitude, lng: currentLoc.coords.longitude });
        })();
    }, []);

    // ─── Review submission handler ──────────────────────────────────────────
    const handleSubmitReview = useCallback(() => {
        if (foodRating === 0 || deliveryRating === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        submitReview(
            {
                orderId: order?.id || id || '',
                foodRating,
                deliveryRating,
                comment: reviewComment || undefined,
            },
            {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowReviewModal(false);
                    setFoodRating(0);
                    setDeliveryRating(0);
                    setReviewComment('');
                },
                onError: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                },
            }
        );
    }, [foodRating, deliveryRating, reviewComment, order?.id, id, submitReview]);

    const displayStatus: OrderStatus | undefined = (realTimeStatus as OrderStatus) || order?.status;
    const showMap = displayStatus ? ['ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY'].includes(displayStatus) : false;

    // Map auto-fit coordinates logic
    useEffect(() => {
        if (showMap && mapRef.current) {
            const coords: { latitude: number; longitude: number }[] = [];
            if (order?.restaurant) coords.push({ latitude: order.restaurant.lat, longitude: order.restaurant.lng });
            if (displayDriverLocation) coords.push({ latitude: displayDriverLocation.lat, longitude: displayDriverLocation.lng });
            if (destination) coords.push({ latitude: destination.lat, longitude: destination.lng });

            if (coords.length > 1 && isMapReady) {
                // Short timeout to ensure Android has completed layout
                setTimeout(() => {
                    mapRef.current?.fitToCoordinates(coords, {
                        edgePadding: { top: 120, right: 60, bottom: 450, left: 60 },
                        animated: true,
                    });

                    setTimeout(() => {
                        mapRef.current?.animateCamera({ pitch: 55 });
                    }, 1000);
                }, 500);
            }
        }
    }, [showMap, order?.restaurant, displayDriverLocation, destination]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={styles.center}>
                <LoadingLottie message="Fetching order details..." />
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

    const showDeliveryOtp = !!order.otp && ['PICKED_UP', 'ON_THE_WAY'].includes(displayStatus!);
    const sc = statusConfig(displayStatus!, isDark, Colors);
    const placedDate = new Date(order.placedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    return (
        <View style={styles.root}>
            {showMap && order.restaurant && (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={Platform.OS === 'android' ? undefined : PROVIDER_GOOGLE}
                        style={styles.map}
                        onMapReady={() => setIsMapReady(true)}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        showsBuildings={true}
                        pitchEnabled={true}
                        userInterfaceStyle="light"
                        region={{
                            latitude: displayDriverLocation?.lat || order.restaurant.lat || 0,
                            longitude: displayDriverLocation?.lng || order.restaurant.lng || 0,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {/* Restaurant Marker */}
                        <Marker
                            coordinate={{ latitude: order.restaurant.lat, longitude: order.restaurant.lng }}
                            title={order.restaurant.name}
                            description="Restaurant"
                        >
                            <View style={styles.markerCircleRest}>
                                <Ionicons name="restaurant" size={16} color="#FFF" />
                            </View>
                        </Marker>

                        {/* Route Polyline */}
                        {routeCoords.length >= 2 && (
                            <Polyline
                                coordinates={routeCoords}
                                strokeWidth={5}
                                strokeColor={Colors.primary}
                                zIndex={10}
                                geodesic={true}
                            />
                        )}

                        {/* Driver Marker (Animated live from sockets) */}
                        {displayDriverLocation && (
                            <Marker.Animated
                                ref={driverMarkerRef}
                                coordinate={animatedDriverLocation as any}
                                title={order.driver?.name || "Your Driver"}
                                description={displayStatus?.replace('_', ' ')}
                                zIndex={20}
                            >
                                <View style={styles.markerCircleDriver}>
                                    <Ionicons name="bicycle" size={18} color="#FFF" />
                                </View>
                            </Marker.Animated>
                        )}

                        {/* Customer Delivery Location Marker */}
                        {destination && (
                            <Marker
                                coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                                title="Delivery Location"
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <View style={styles.deliveryPinContainer}>
                                    <View style={styles.deliveryPinHead}>
                                        <Ionicons name="home" size={14} color="#FFF" />
                                    </View>
                                    <View style={styles.deliveryPinTail} />
                                </View>
                            </Marker>
                        )}
                    </MapView>

                    {/* ── ETA Overlay (Zomato/Swiggy-style) ── */}
                    {eta && displayDriverLocation && (
                        <Animated.View style={[styles.etaOverlay, { transform: [{ scale: etaPulse }] }]}>
                            <View style={styles.etaOverlayTop}>
                                <Ionicons name="time" size={18} color="#FFF" />
                                <Text style={styles.etaTimeText}>{eta.etaMinutes} min</Text>
                            </View>
                            <Text style={styles.etaDistText}>{eta.distanceKm} km away</Text>
                        </Animated.View>
                    )}
                </View>
            )}

            <ScrollView
                style={styles.scrollViewContainer}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                decelerationRate="normal"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
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

                {/* ── Driver (enhanced with call + chat + vehicle info) ───── */}
                {order.driver && displayStatus !== 'DELIVERED' && (
                    <SectionCard Colors={Colors} styles={styles} title="Delivery Partner" icon="bicycle-outline">
                        <View style={styles.driverRow}>
                            <View style={styles.driverAvatar}>
                                <Ionicons name="person" size={22} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.driverName}>{order.driver.name}</Text>
                                {(order.driver as any).vehiclePlate && (
                                    <View style={styles.vehicleBadge}>
                                        <Ionicons name="car-sport-outline" size={12} color={Colors.textSecondary} />
                                        <Text style={styles.vehiclePlateText}>{(order.driver as any).vehiclePlate}</Text>
                                    </View>
                                )}
                            </View>
                            {/* Call & Chat Buttons */}
                            <View style={styles.driverActionsContainer}>
                                {order.driver.phone && (
                                    <TouchableOpacity
                                        style={styles.callDriverBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (order.driver?.phone) {
                                                Linking.openURL(`tel:${order.driver.phone}`);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="call" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.chatDriverBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        // Chat functionality will be implemented in future
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {/* ── Driver (after delivery) ───── */}
                {order.driver && displayStatus === 'DELIVERED' && (
                    <SectionCard Colors={Colors} styles={styles} title="Delivery Partner" icon="bicycle-outline">
                        <View style={styles.driverRow}>
                            <View style={styles.driverAvatar}>
                                <Ionicons name="person" size={22} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.driverName}>{order.driver.name}</Text>
                                {(order.driver as any).vehiclePlate && (
                                    <View style={styles.vehicleBadge}>
                                        <Ionicons name="car-sport-outline" size={12} color={Colors.textSecondary} />
                                        <Text style={styles.vehiclePlateText}>{(order.driver as any).vehiclePlate}</Text>
                                    </View>
                                )}
                            </View>
                            {/* Call & Chat Buttons */}
                            <View style={styles.driverActionsContainer}>
                                {order.driver.phone && (
                                    <TouchableOpacity
                                        style={styles.callDriverBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (order.driver?.phone) {
                                                Linking.openURL(`tel:${order.driver.phone}`);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="call" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.chatDriverBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        // Chat functionality will be implemented in future
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SectionCard>
                )}

                {showDeliveryOtp && (
                    <SectionCard Colors={Colors} styles={styles} title="Delivery OTP" icon="key-outline">
                        <Text style={styles.otpValue}>{order.otp}</Text>
                        <Text style={styles.otpHint}>
                            Share this OTP with your rider only after the order reaches you.
                        </Text>
                    </SectionCard>
                )}
                {/* ── Items ────────────────────────────────────────────── */}
                <SectionCard Colors={Colors} styles={styles} title="Order Items" icon="bag-outline">
                    {order.items.map((item, idx) => (
                        <View
                            key={item.id}
                            style={[
                                styles.itemRow,
                                idx < order.items.length - 1 && styles.itemRowBorder,
                            ]}
                        >
                            <View style={styles.itemImageContainer}>
                                {item.menuItem.image ? (
                                    <Image
                                        source={{ uri: item.menuItem.image }}
                                        style={styles.itemImage}
                                        contentFit="cover"
                                        transition={300}
                                    />
                                ) : (
                                    <View style={styles.itemImagePlaceholder}>
                                        <Ionicons name="fast-food-outline" size={20} color={Colors.muted} />
                                    </View>
                                )}
                                {/* Veg / Non-veg dot overlay */}
                                <View
                                    style={[
                                        styles.vegDotOverlay,
                                        {
                                            backgroundColor:
                                                item.menuItem.type === 'VEG'
                                                    ? Colors.success
                                                    : Colors.danger,
                                        },
                                    ]}
                                />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                                {item.menuItem.description && (
                                    <Text style={styles.itemDesc} numberOfLines={2}>
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
                <SectionCard Colors={Colors} styles={styles} title="Bill Summary" icon="receipt-outline">
                    <InfoRow styles={styles} label="Item Total" value={`₹${order.itemTotal}`} />
                    <InfoRow styles={styles} label="GST & Taxes" value={`₹${order.tax}`} />
                    <InfoRow styles={styles} label="Delivery Charge" value={`₹${order.deliveryCharge}`} />
                    <InfoRow styles={styles} label="Platform Fee" value={`₹${order.platformFee}`} />
                    {order.driverTip > 0 && (
                        <InfoRow styles={styles} label="Driver Tip" value={`₹${order.driverTip}`} />
                    )}
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
                    </View>
                </SectionCard>

                {/* ── Payment ──────────────────────────────────────────── */}
                <SectionCard Colors={Colors} styles={styles} title="Payment" icon="card-outline">
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

                {/* ── Delivery Address ─────────────────────────────────── */}
                {order.customerAddress && (
                    <SectionCard Colors={Colors} styles={styles} title="Delivery Address" icon="location-outline">
                        <View style={{ gap: 4 }}>
                            {(order.customerAddress as any).receiverName ? (
                                <Text style={{ fontFamily: Fonts.brandBold, fontSize: FontSize.sm, color: Colors.text }}>
                                    {(order.customerAddress as any).receiverName}
                                </Text>
                            ) : null}
                            <Text style={{ fontFamily: Fonts.brandMedium, fontSize: FontSize.sm, color: Colors.textSecondary }}>
                                {order.customerAddress.addressLine}
                            </Text>
                            {order.customerAddress.landmark ? (
                                <Text style={{ fontFamily: Fonts.brand, fontSize: FontSize.xs, color: Colors.muted }}>
                                    Landmark: {order.customerAddress.landmark}
                                </Text>
                            ) : null}
                            {(order.customerAddress as any).receiverPhone ? (
                                <Text style={{ fontFamily: Fonts.brand, fontSize: FontSize.xs, color: Colors.muted }}>
                                    Phone: {(order.customerAddress as any).receiverPhone}
                                </Text>
                            ) : null}
                        </View>
                    </SectionCard>
                )}

                {/* ── Cancellation Reason ───────────────────────────────── */}
                {order.cancellationReason && (
                    <SectionCard Colors={Colors} styles={styles} title="Cancellation Reason" icon="information-circle-outline">
                        <Text style={styles.cancelReason}>{order.cancellationReason}</Text>
                    </SectionCard>
                )}
                {/* ── Restaurant ───────────────────────────────────────── */}
                <SectionCard Colors={Colors} styles={styles} title="Restaurant" icon="restaurant-outline">
                    <View style={styles.restHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.restName}>{order.restaurant.name}</Text>
                            {order.restaurant.description && (
                                <Text style={styles.restDesc} numberOfLines={2}>{order.restaurant.description}</Text>
                            )}
                        </View>
                        {order.restaurant.image ? (
                            <Image
                                source={{ uri: order.restaurant.image }}
                                style={styles.restImage}
                                contentFit="cover"
                                transition={300}
                            />
                        ) : (
                            <View style={styles.restImagePlaceholder}>
                                <Ionicons name="restaurant-outline" size={24} color={Colors.muted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.restMeta}>
                        <Ionicons name="location-outline" size={13} color={Colors.muted} />
                        <Text style={styles.restMetaText} numberOfLines={1}>{order.restaurant.address}</Text>
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

                {/* ── Review Section (after delivery) ───── */}
                {displayStatus === 'DELIVERED' && !order?.review && (
                    <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowReviewModal(true);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="star-outline" size={20} color="#FFF" />
                        <Text style={styles.reviewButtonText}>Rate Your Experience</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* ── Review Modal (Bottom Sheet) ── */}
            <Modal
                visible={showReviewModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReviewModal(false)}
            >
                <View style={styles.reviewModalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoidingView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                    >
                        <View style={styles.reviewModalContainer} ref={reviewModalRef}>
                            {/* Header */}
                            <View style={styles.reviewModalHeader}>
                                <Text style={styles.reviewModalTitle}>Rate Your Experience</Text>
                                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                    <Ionicons name="close" size={24} color={Colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.reviewModalContent}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                scrollEnabled={true}
                            >
                                {/* Food Rating */}
                                <View style={styles.ratingSection}>
                                    <Text style={styles.ratingLabel}>Food Quality</Text>
                                    <View style={styles.starsContainer}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <TouchableOpacity
                                                key={`food-${star}`}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setFoodRating(star);
                                                }}
                                            >
                                                <Ionicons
                                                    name={star <= foodRating ? 'star' : 'star-outline'}
                                                    size={40}
                                                    color={star <= foodRating ? '#FFD700' : Colors.muted}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Delivery Rating */}
                                <View style={styles.ratingSection}>
                                    <Text style={styles.ratingLabel}>Delivery Experience</Text>
                                    <View style={styles.starsContainer}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <TouchableOpacity
                                                key={`delivery-${star}`}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setDeliveryRating(star);
                                                }}
                                            >
                                                <Ionicons
                                                    name={star <= deliveryRating ? 'star' : 'star-outline'}
                                                    size={40}
                                                    color={star <= deliveryRating ? '#FFD700' : Colors.muted}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Comment Input */}
                                <View style={styles.commentSection}>
                                    <Text style={styles.ratingLabel}>Additional Comments (Optional)</Text>
                                    <TextInput
                                        style={styles.commentInput}
                                        placeholder="Share your feedback..."
                                        placeholderTextColor={Colors.muted}
                                        value={reviewComment}
                                        onChangeText={setReviewComment}
                                        multiline
                                        maxLength={500}
                                    />
                                    <Text style={styles.charCount}>
                                        {reviewComment.length}/500
                                    </Text>
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitReviewBtn,
                                        (foodRating === 0 || deliveryRating === 0) && styles.submitReviewBtnDisabled,
                                    ]}
                                    onPress={handleSubmitReview}
                                    disabled={isSubmittingReview || foodRating === 0 || deliveryRating === 0}
                                    activeOpacity={0.8}
                                >
                                    {isSubmittingReview ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                            <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.modalSpacing} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    mapContainer: {
        height: '35%',
        width: '100%',
        overflow: 'hidden',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
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
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
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
        backgroundColor: Colors.background,
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
        backgroundColor: Colors.surface,
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
    restHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    restImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: Colors.surface,
    },
    restImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    restDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.muted,
        lineHeight: 18,
        marginTop: 2,
    },
    restMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
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
        marginTop: 4,
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
        gap: 12,
        paddingVertical: 12,
    },
    itemRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemImageContainer: {
        position: 'relative',
    },
    itemImage: {
        width: 54,
        height: 54,
        borderRadius: 10,
        backgroundColor: Colors.surface,
    },
    itemImagePlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 10,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    vegDotOverlay: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.white,
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
    vehicleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
        backgroundColor: Colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    vehiclePlateText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 11,
        color: Colors.textSecondary,
        letterSpacing: 0.5,
    },
    callDriverBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2ECC71',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
    chatDriverBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
    driverActionsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    quickCallBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2ECC71',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
        flexShrink: 0,
    },

    // ── ETA Overlay ────────────────────────────────────────────────────────
    etaOverlay: {
        position: 'absolute',
        top: 14,
        alignSelf: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 120,
    },
    etaOverlayTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    etaTimeText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: '#FFF',
    },
    etaDistText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // ── Delivery Location Pin ─────────────────────────────────────────────
    deliveryPinContainer: {
        alignItems: 'center',
    },
    deliveryPinHead: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4285F4',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    deliveryPinTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#4285F4',
        marginTop: -2,
    },

    // ── Cancellation ───────────────────────────────────────────────────────
    cancelReason: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.danger,
        lineHeight: 20,
    },

    // ── Review Button ──────────────────────────────────────────────────────
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        marginVertical: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 5,
    },
    reviewButtonText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: '#FFF',
    },

    // ── Review Modal ───────────────────────────────────────────────────────
    reviewModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    reviewModalContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '88%',
        paddingTop: 8,
    },
    reviewModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    reviewModalTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
    },
    reviewModalContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },

    // ── Rating Sections ────────────────────────────────────────────────────
    ratingSection: {
        marginBottom: 24,
    },
    ratingLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },

    // ── Comment Section ───────────────────────────────────────────────────
    commentSection: {
        marginBottom: 20,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.text,
        textAlignVertical: 'top',
        minHeight: 100,
        maxHeight: 150,
    },
    charCount: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 6,
        textAlign: 'right',
    },

    // ── Submit Button ──────────────────────────────────────────────────────
    submitReviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 5,
    },
    submitReviewBtnDisabled: {
        backgroundColor: Colors.muted,
        shadowOpacity: 0.15,
    },
    submitReviewBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: '#FFF',
    },
    modalSpacing: {
        height: 300,
    },
});