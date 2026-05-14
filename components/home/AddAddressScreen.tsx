import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { showAlert } from '@/store/useAlertStore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { useAddAddress } from '@/hooks/useAddresses';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const whiteMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    }
];

// --- TYPESCRIPT INTERFACES ---

interface AddressFormState {
    type?: string;
    addressLine: string;
    landmark?: string;
    receiverName?: string;
    receiverPhone?: string;
    lat: number | null;
    lng: number | null;
}

interface AddressTypeOption {
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}

export default function AddAddressScreen({ setOpenAdressAddform }: { setOpenAdressAddform: React.Dispatch<React.SetStateAction<boolean>> }) {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

    const [form, setForm] = useState<AddressFormState>({
        type: 'HOME', // Defaulted to HOME
        addressLine: '',
        landmark: '',
        receiverName: '',
        receiverPhone: '',
        lat: null,
        lng: null,
    });

    const [isFetchingLocation, setIsFetchingLocation] = useState<boolean>(false);
    const [locationError, setLocationError] = useState<string>('');
    const { mutate: addAddress, isPending } = useAddAddress();
    const { reverseGeocode, isLoading: isGeocoding } = useReverseGeocode();

    useEffect(() => {
        handleFetchLocation();
    }, []);

    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>({
        latitude: 30.3165, // Default Dehradun
        longitude: 78.0322,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });

    const addressTypes: AddressTypeOption[] = [
        { id: 'HOME', label: 'Home', icon: 'home-outline' },
        { id: 'WORK', label: 'Work', icon: 'briefcase-outline' },
        { id: 'OTHER', label: 'Other', icon: 'location-outline' },
    ];

    // --- HANDLERS ---

    const handleFetchLocation = async (): Promise<void> => {
        setIsFetchingLocation(true);
        setLocationError('');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission denied. Please enter address manually.');
                setIsFetchingLocation(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            };

            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);

            setForm(prev => ({
                ...prev,
                lat: latitude,
                lng: longitude
            }));

            // Trigger reverse geocode
            const result = await reverseGeocode(latitude, longitude);
            if (result) {
                setForm(prev => ({
                    ...prev,
                    addressLine: result.addressLine,
                    landmark: result.landmark || prev.landmark
                }));
            }
        } catch (error) {
            setLocationError('Could not fetch location.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleRegionChangeComplete = async (newRegion: Region) => {
        setRegion(newRegion);
        setForm(prev => ({
            ...prev,
            lat: newRegion.latitude,
            lng: newRegion.longitude
        }));

        const result = await reverseGeocode(newRegion.latitude, newRegion.longitude);
        if (result) {
            setForm(prev => ({
                ...prev,
                addressLine: result.addressLine,
                landmark: result.landmark || prev.landmark
            }));
        }
    };

    const handlePlaceSelect = async (data: any, details: any = null) => {
        if (details) {
            const { lat, lng } = details.geometry.location;
            const newRegion = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            };

            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);
            
            setForm(prev => ({
                ...prev,
                lat,
                lng,
                addressLine: details.formatted_address || data.description
            }));

            // Optional: Still run reverse geocode to get landmarks specifically if needed
            const result = await reverseGeocode(lat, lng);
            if (result) {
                setForm(prev => ({
                    ...prev,
                    landmark: result.landmark || prev.landmark
                }));
            }
        }
    };

    const handleSaveAddress = (): void => {
        // Basic validation
        if (!form.addressLine.trim()) {
            showAlert("Error", "Please enter your complete address.");
            return;
        }
        if (!form.type) {
            showAlert("Error", "Please select an address type.");
            return;
        }
        if (!form.lat || !form.lng) {
            showAlert("Notice", "Please fetch your location coordinates first.");
            return;
        }

        // Create payload
        const payload: AddressFormState = { ...form };

        console.log("Submitting Address Payload:", payload);

        // Call the mutation
        addAddress(payload, {
            onSuccess: () => {
                showAlert("Success", "Address added successfully!");
                setOpenAdressAddform(false);
            },
            onError: (error) => {
                showAlert("Error", "Failed to save address. Please try again.");
                console.error("Save Address Error:", error);
            }
        });
    };

    // --- RENDER ---

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >

                {/* Map and Search Section */}
                <View style={styles.mapWrapper}>
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={region}
                        onRegionChangeComplete={handleRegionChangeComplete}
                        customMapStyle={isDark ? darkMapStyle : whiteMapStyle}
                    >
                        {form.lat && form.lng && (
                            <Marker
                                coordinate={{ latitude: form.lat, longitude: form.lng }}
                                title="Delivery Location"
                            />
                        )}
                    </MapView>

                    {/* Tooltip Overlay */}
                    <View style={styles.mapTooltip}>
                        <Text style={styles.mapTooltipText}>Move pin to your exact delivery location</Text>
                    </View>

                    {/* Search Bar Overlay */}
                    <View style={styles.searchContainer}>
                        <GooglePlacesAutocomplete
                            placeholder="Search for area, street name..."
                            onPress={handlePlaceSelect}
                            fetchDetails={true}
                            minLength={2}
                            debounce={400}
                            onFail={(error) => {
                                console.error("Places Autocomplete Error:", error);
                                showAlert("Search Error", `Google Maps Search failed: ${error}`);
                            }}
                            query={{
                                key: process.env.EXPO_PUBLIC_GEOCODING_API_KEY,
                                language: 'en',
                                components: 'country:in',
                            }}
                            textInputProps={{
                                placeholderTextColor: Colors.muted,
                            }}
                            styles={{
                                container: { 
                                    flex: 0, 
                                    width: '100%',
                                    zIndex: 1000,
                                },
                                textInput: styles.searchInput,
                                listView: styles.searchListView,
                                row: {
                                    backgroundColor: isDark ? Colors.surface : '#FFFFFF',
                                    padding: 13,
                                    height: 44,
                                    flexDirection: 'row',
                                },
                                description: {
                                    fontFamily: Fonts.brand,
                                    fontSize: FontSize.sm,
                                    color: isDark ? Colors.text : '#000000',
                                },
                                predefinedPlacesDescription: {
                                    color: '#1faadb',
                                },
                            }}
                            enablePoweredByContainer={false}
                            renderLeftButton={() => (
                                <View style={styles.searchIconWrapper}>
                                    <Ionicons name="search" size={20} color={Colors.primary} />
                                </View>
                            )}
                        />
                    </View>

                    {/* Use Current Location Pill */}
                    <TouchableOpacity
                        style={styles.locationPill}
                        onPress={handleFetchLocation}
                        disabled={isFetchingLocation}
                    >
                        {isFetchingLocation ? (
                            <ActivityIndicator color={Colors.primary} size="small" />
                        ) : (
                            <>
                                <Ionicons name="locate" size={18} color={Colors.primary} />
                                <Text style={styles.locationPillText}>Use current location</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                {locationError ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 10 }]}>{locationError}</Text> : null}

                <View style={styles.formSection}>
                    {/* Address Line Input */}
                    <Text style={styles.inputLabel}>Complete Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. 15 Rajpur Road, Dehradun"
                        placeholderTextColor={Colors.muted}
                        value={form.addressLine}
                        onChangeText={(text: string) => setForm({ ...form, addressLine: text })}
                        multiline
                        textAlignVertical="top"
                    />
                    <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="E.g. Near Apollo Hospital"
                        placeholderTextColor={Colors.muted}
                        value={form.landmark}
                        onChangeText={(text: string) => setForm({ ...form, landmark: text })}
                    />

                    {/* Receiver Contact Details */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.inputLabel}>Receiver Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Rahul"
                                placeholderTextColor={Colors.muted}
                                value={form.receiverName}
                                onChangeText={(text: string) => setForm({ ...form, receiverName: text })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.inputLabel}>Receiver Phone</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 9876543210"
                                placeholderTextColor={Colors.muted}
                                value={form.receiverPhone}
                                onChangeText={(text: string) => setForm({ ...form, receiverPhone: text })}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Address Type Selector */}
                    <Text style={styles.inputLabel}>Save As</Text>
                    <View style={styles.typeContainer}>
                        {addressTypes.map((type) => {
                            const isSelected = form.type === type.id;
                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                                    onPress={() => {
                                        setForm({ ...form, type: type.id });
                                    }}
                                >
                                    <Ionicons
                                        name={type.icon}
                                        size={18}
                                        color={isSelected ? Colors.primary : Colors.textSecondary}
                                    />
                                    <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    disabled={isPending || isFetchingLocation}
                    style={[styles.submitButton, (isPending || isFetchingLocation) && styles.submitButtonDisabled]}
                    onPress={handleSaveAddress}
                >
                    {isPending ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.submitButtonText}>Save Address</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const darkMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#242f3e" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#242f3e" }]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#263c3f" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#6b9a76" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#38414e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#212a37" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9ca5b3" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#1f2835" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#f3d19c" }]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{ "color": "#2f3948" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#17263c" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#515c6d" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#17263c" }]
    }
];

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    // ... Keep the exact same styles as before!
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    mapWrapper: {
        height: 350,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        position: 'relative',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    searchContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        zIndex: 1000, // Elevated to appear above map
        elevation: 10,
    },
    searchInput: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 44,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        color: Colors.text,
        backgroundColor: isDark ? Colors.surface : Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    searchListView: {
        backgroundColor: isDark ? Colors.surface : Colors.white,
        borderRadius: 12,
        marginTop: 5,
        elevation: 10,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        maxHeight: 200, // Limit list height
    },
    searchIconWrapper: {
        position: 'absolute',
        left: 14,
        top: 14,
        zIndex: 101,
    },
    mapTooltip: {
        position: 'absolute',
        top: 70,
        alignSelf: 'center',
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        zIndex: 10,
    },
    mapTooltipText: {
        color: Colors.white,
        fontSize: FontSize.xs,
        fontFamily: Fonts.brandMedium,
    },
    locationPill: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? Colors.surface : Colors.white,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? Colors.border : Colors.secondary, // Midnight Navy border
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    locationPillText: {
        fontFamily: Fonts.brandMedium,
        color: isDark ? Colors.text : Colors.secondary, // Midnight Navy
        marginLeft: 8,
        fontSize: FontSize.sm,
    },
    errorText: {
        color: Colors.danger,
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        marginTop: 8,
    },
    formSection: {
        flex: 1,
    },
    inputLabel: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.secondary, // Midnight Navy labels
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        color: Colors.text,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textArea: {
        height: 100,
    },
    typeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        marginHorizontal: 4,
        backgroundColor: Colors.surface,
    },
    typeButtonSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    typeText: {
        fontFamily: Fonts.brandMedium,
        color: Colors.secondary, // Midnight Navy for unselected text
        marginLeft: 6,
        fontSize: FontSize.sm,
    },
    typeTextSelected: {
        color: Colors.primary,
        fontFamily: Fonts.brandBold,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        padding: 20,
        borderTopWidth: 1.5,
        borderTopColor: Colors.secondary, // Midnight Navy footer divider
    },
    submitButton: {
        backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy main action button
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonDisabled: {
        backgroundColor: Colors.muted,
        opacity: 0.7,
    },
    submitButtonText: {
        color: Colors.primary, // Gold text on Navy button
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
    },
});