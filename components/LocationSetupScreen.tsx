import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useReverseGeocode, GeocodeAddressResult } from '@/hooks/useReverseGeocode';
import { useAddAddress } from '@/hooks/useAddresses';
import { showAlert } from '@/store/useAlertStore';

// ─── SecureStore key ──────────────────────────────────────────────────────────
const LOCATION_SETUP_DONE_KEY = 'location_setup_done';

export async function shouldShowLocationSetup(): Promise<boolean> {
    const done = await SecureStore.getItemAsync(LOCATION_SETUP_DONE_KEY);
    return done !== 'true';
}

export async function markLocationSetupDone(): Promise<void> {
    await SecureStore.setItemAsync(LOCATION_SETUP_DONE_KEY, 'true');
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LocationSetupScreenProps {
    onDone: () => void;
}

type SetupStep = 'detecting' | 'geocoding' | 'found' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationSetupScreen({ onDone }: LocationSetupScreenProps) {
    const { Colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const [step, setStep] = useState<SetupStep>('detecting');
    const [geocodeResult, setGeocodeResult] = useState<GeocodeAddressResult | null>(null);
    const [hasAttemptedGeocode, setHasAttemptedGeocode] = useState(false);
    const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);

    // 1️⃣  Get coordinates from the existing hook
    const { coords, isLoading: locationLoading, error: locationError, refresh } = useUserLocation();

    // 2️⃣  Reverse-geocode those coordinates
    const { reverseGeocode, isLoading: geocodeLoading } = useReverseGeocode();

    // 3️⃣  Save the resolved address
    const { mutate: addAddress, isPending: isSaving } = useAddAddress();

    // ─── Animations ───────────────────────────────────────────────────────────
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const logoPulse = useRef(new Animated.Value(1)).current;
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const ripple3 = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;

    // Entrance
    useEffect(() => {
        Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
            Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    // Ripple loop — runs while step is detecting or geocoding
    useEffect(() => {
        if (step !== 'detecting' && step !== 'geocoding') return;

        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(logoPulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
                Animated.timing(logoPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );

        const makeRipple = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );

        pulse.start();
        makeRipple(ripple1, 0).start();
        makeRipple(ripple2, 600).start();
        makeRipple(ripple3, 1200).start();

        return () => {
            pulse.stop();
            ripple1.stopAnimation();
            ripple2.stopAnimation();
            ripple3.stopAnimation();
        };
    }, [step]);

    // ─── Step 1 → Step 2: once coords arrive, run geocode ────────────────────

    // Helper to check if coordinates changed significantly
    function coordsChangedSignificantly(a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null, threshold = 0.001) {
        if (!a || !b) return false;
        const latDiff = Math.abs(a.lat - b.lat);
        const lngDiff = Math.abs(a.lng - b.lng);
        return latDiff > threshold || lngDiff > threshold;
    }

    useEffect(() => {
        // If error, show error
        if (locationError) {
            setStep('error');
            return;
        }

        // If coords changed significantly, reset geocode attempt
        if (coords && lastCoords && coordsChangedSignificantly(coords, lastCoords)) {
            setHasAttemptedGeocode(false);
            setGeocodeResult(null);
            setStep('detecting');
        }

        // Only geocode if not attempted yet
        if (!locationLoading && coords && !hasAttemptedGeocode) {
            setHasAttemptedGeocode(true);
            setLastCoords(coords);
            setStep('geocoding');

            reverseGeocode(coords.lat, coords.lng).then((result) => {
                if (result) {
                    setGeocodeResult(result);
                    setStep('found');
                } else {
                    setStep('error');
                }
            });
        }
    }, [coords, locationLoading, locationError, hasAttemptedGeocode, lastCoords]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleRetry = () => {
        setHasAttemptedGeocode(false);
        setGeocodeResult(null);
        setStep('detecting');
        refresh(); // triggers useUserLocation to re-fetch
    };

    const handleSaveAndContinue = () => {
        if (!geocodeResult) return;

        addAddress(
            {
                addressLine: geocodeResult.addressLine,
                landmark: geocodeResult.landmark,
                lat: geocodeResult.lat,
                lng: geocodeResult.lng,
                type: 'HOME',
            },
            {
                onSuccess: async () => {
                    await markLocationSetupDone();
                    onDone();
                },
                onError: async (error: any) => {
                    console.error('Failed to save address:', error);
                    await markLocationSetupDone();
                    showAlert(
                        'Address Not Saved',
                        'We detected your location but could not save it. You can add it manually from your profile.',
                        [{ text: 'Continue', onPress: onDone }]
                    );
                },
            }
        );
    };

    const handleSkip = async () => {
        await markLocationSetupDone();
        onDone();
    };

    // ─── Ripple style helper ──────────────────────────────────────────────────
    const rippleStyle = (anim: Animated.Value) => ({
        ...StyleSheet.absoluteFillObject,
        borderRadius: 100,
        borderWidth: 1.5,
        borderColor: Colors.secondary,
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.15, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
    });

    // ─── Status label shown below logo ───────────────────────────────────────
    const statusLabel =
        step === 'detecting' ? 'Requesting location…' :
        step === 'geocoding' ? 'Resolving address…' : null;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Skip */}
            <Animated.View style={[styles.skipContainer, { opacity: fadeIn }]}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
                    <Text style={styles.skipText}>Skip</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                </TouchableOpacity>
            </Animated.View>

            {/* Logo + ripples */}
            <View style={styles.logoWrapper}>
                <Animated.View style={rippleStyle(ripple1)} />
                <Animated.View style={rippleStyle(ripple2)} />
                <Animated.View style={rippleStyle(ripple3)} />
                <Animated.View
                    style={[
                        styles.logoCircle,
                        { transform: [{ scale: Animated.multiply(logoScale, logoPulse) }] },
                    ]}
                >
                    <Image
                        source={require('@/assets/images/app-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>
            </View>

            {/* Spinner status label */}
            {statusLabel && (
                <Animated.View style={[styles.statusRow, { opacity: fadeIn }]}>
                    <ActivityIndicator color={Colors.secondary} size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.statusText}>{statusLabel}</Text>
                </Animated.View>
            )}

            {/* Dynamic content */}
            <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

                {/* ── DETECTING / GEOCODING ── */}
                {(step === 'detecting' || step === 'geocoding') && (
                    <>
                        <Text style={styles.title}>Detecting Your Location</Text>
                        <Text style={styles.subtitle}>
                            We&apos;re finding your current location to set up your delivery address automatically.
                        </Text>
                    </>
                )}

                {/* ── FOUND ── */}
                {step === 'found' && geocodeResult && (
                    <>
                        <View style={styles.badge}>
                            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                            <Text style={[styles.badgeText, { color: Colors.success }]}>Location Found!</Text>
                        </View>

                        <Text style={styles.title}>We Found You!</Text>
                        <Text style={styles.subtitle}>
                            We&apos;ll save this as your default Home address. You can edit it anytime from your profile.
                        </Text>

                        <View style={styles.addressCard}>
                            <Ionicons name="location" size={22} color={Colors.secondary} style={styles.addressIcon} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addressLine} numberOfLines={3}>
                                    {geocodeResult.addressLine}
                                </Text>
                                {geocodeResult.landmark ? (
                                    <Text style={styles.addressLandmark}>
                                        Near {geocodeResult.landmark}
                                    </Text>
                                ) : null}
                                <Text style={styles.coordsText}>
                                    {geocodeResult.lat.toFixed(5)}, {geocodeResult.lng.toFixed(5)}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
                            onPress={handleSaveAndContinue}
                            disabled={isSaving}
                            activeOpacity={0.85}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={Colors.background} />
                            ) : (
                                <>
                                    <Ionicons name="home" size={18} color={Colors.background} />
                                    <Text style={styles.primaryBtnText}>Save & Continue</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSkip} style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Use a Different Address</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* ── ERROR ── */}
                {step === 'error' && (
                    <>
                        <View style={[styles.badge, styles.badgeWarning]}>
                            <Ionicons name="warning" size={18} color={Colors.warning} />
                            <Text style={[styles.badgeText, { color: Colors.warning }]}>
                                Location Unavailable
                            </Text>
                        </View>

                        <Text style={styles.title}>Couldn&apos;t Detect Location</Text>
                        <Text style={styles.subtitle}>
                            Please enable location permissions or add your address manually from your profile.
                        </Text>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry} activeOpacity={0.85}>
                            <Ionicons name="refresh" size={18} color={Colors.background} />
                            <Text style={styles.primaryBtnText}>Try Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSkip} style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Add Address Manually Later</Text>
                        </TouchableOpacity>
                    </>
                )}
            </Animated.View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    skipContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
    },
    skipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 2,
    },
    skipText: {
        color: Colors.muted,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
    },

    // ── Logo ──────────────────────────────────────────────────────
    logoWrapper: {
        width: 150,
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    logo: {
        width: 80,
        height: 80,
    },

    // ── Status row ────────────────────────────────────────────────
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 28,
    },
    statusText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.secondary,
    },

    // ── Content ───────────────────────────────────────────────────
    content: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },

    // ── Badge ─────────────────────────────────────────────────────
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8FAF0',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 50,
        marginBottom: 14,
    },
    badgeWarning: {
        backgroundColor: '#FFF8E1',
    },
    badgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
    },

    // ── Address card ──────────────────────────────────────────────
    addressCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.secondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        width: '100%',
        alignItems: 'flex-start',
    },
    addressIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    addressLine: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.text,
        lineHeight: 22,
    },
    addressLandmark: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    coordsText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 6,
    },

    // ── Buttons ───────────────────────────────────────────────────
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.secondary,
        paddingVertical: 16,
        borderRadius: 14,
        width: '100%',
        marginBottom: 14,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    primaryBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary, // Gold
    },
    secondaryBtn: {
        paddingVertical: 12,
    },
    secondaryBtnText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.muted,
        textDecorationLine: 'underline',
    },
});
