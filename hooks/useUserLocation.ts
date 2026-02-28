import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface UserCoords {
    lat: number;
    lng: number;
}

export interface UseUserLocationResult {
    coords: UserCoords | null;
    isLoading: boolean;
    error: string | null;
    /** Re-request location manually */
    refresh: () => void;
}

/**
 * Requests foreground location permission once on mount, then
 * continuously tracks the device location via watchPositionAsync.
 * Returns the latest coords plus loading / error state.
 */
export function useUserLocation(): UseUserLocationResult {
    const [coords, setCoords] = useState<UserCoords | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const start = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Location permission denied. Some features may be limited.');
                    setIsLoading(false);
                    return;
                }

                // Get a quick one-shot position first so search doesn't wait for watch
                const position = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setIsLoading(false);

                // Then keep watching for updates while the hook is mounted
                subscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
                    (loc) => {
                        setCoords({
                            lat: loc.coords.latitude,
                            lng: loc.coords.longitude,
                        });
                    }
                );
            } catch (err: any) {
                setError(err?.message ?? 'Could not fetch location.');
                setIsLoading(false);
            }
        };

        start();

        return () => {
            subscription?.remove();
        };
    }, [refreshKey]);

    return {
        coords,
        isLoading,
        error,
        refresh: () => setRefreshKey((k) => k + 1),
    };
}
