import React, { useState } from 'react';
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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAddAddress } from '@/hooks/useAddresses';

// --- TYPESCRIPT INTERFACES ---

interface AddressFormState {
    type?: string;
    addressLine: string;
    landmark?: string;
    lat: number | null;
    lng: number | null;
}

interface AddressTypeOption {
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
}

export default function AddAddressScreen({ setOpenAdressAddform }: { setOpenAdressAddform: React.Dispatch<React.SetStateAction<boolean>> }) {

    const [form, setForm] = useState<AddressFormState>({
        type: '', // 👈 UPDATED: Starts blank instead of 'HOME'
        addressLine: '',
        landmark: '',
        lat: null,
        lng: null,
    });

    const [isFetchingLocation, setIsFetchingLocation] = useState<boolean>(false);
    const [locationError, setLocationError] = useState<string>('');
    const { mutate: addAddress, isPending } = useAddAddress();

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
            setForm({
                ...form,
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });
        } catch (error) {
            setLocationError('Could not fetch location.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleSaveAddress = (): void => {
        // Basic validation to ensure the user actually entered an address line
        if (!form.addressLine.trim()) {
            Alert.alert("Error", "Please enter your complete address.");
            return;
        }
        if (!form.lat || !form.lng) {
            Alert.alert("Notice", "Please fetch your location coordinates first.");
            return;
        }

        // Create payload
        const payload: AddressFormState = { ...form };

        // If type is empty, let the backend handle the default
        if (!payload.type) {
            delete payload.type;
        }

        console.log("Submitting Address Payload:", payload);

        // Call the mutation
        addAddress(payload, {
            onSuccess: () => {
                Alert.alert("Success", "Address added successfully!");
                setOpenAdressAddform(false);
            },
            onError: (error) => {
                Alert.alert("Error", "Failed to save address. Please try again.");
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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header section / Map Placeholder */}
                <View style={styles.locationSection}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="map" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.locationTitle}>Set Delivery Location</Text>
                    <Text style={styles.locationSubtitle}>
                        {form.lat && form.lng
                            ? `Lat: ${form.lat.toFixed(4)}, Lng: ${form.lng.toFixed(4)}`
                            : 'No coordinates fetched yet'}
                    </Text>

                    <TouchableOpacity
                        style={styles.fetchLocationBtn}
                        onPress={handleFetchLocation}
                        disabled={isFetchingLocation}
                    >
                        {isFetchingLocation ? (
                            <ActivityIndicator color={Colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="locate" size={18} color={Colors.primary} />
                                <Text style={styles.fetchLocationText}>Use Current Location</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
                </View>

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

                    {/* Landmark Input */}
                    <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Opposite Silvercity Mall"
                        placeholderTextColor={Colors.muted}
                        value={form.landmark}
                        onChangeText={(text: string) => setForm({ ...form, landmark: text })}
                    />

                    {/* Address Type Selector */}
                    <Text style={styles.inputLabel}>Save As (Optional)</Text>
                    <View style={styles.typeContainer}>
                        {addressTypes.map((type) => {
                            const isSelected = form.type === type.id;
                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                                    onPress={() => {
                                        // 👈 UPDATED: If they click the already selected button, it deselects it (sets to blank)
                                        setForm({ ...form, type: isSelected ? '' : type.id });
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

const styles = StyleSheet.create({
    // ... Keep the exact same styles as before!
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    locationSection: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    locationTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.text,
        marginBottom: 4,
    },
    locationSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 16,
    },
    fetchLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    fetchLocationText: {
        fontFamily: Fonts.brandMedium,
        color: Colors.primary,
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
        color: Colors.text,
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
        color: Colors.textSecondary,
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
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: Colors.muted,
        opacity: 0.7,
    },
    submitButtonText: {
        color: Colors.white,
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
    },
});