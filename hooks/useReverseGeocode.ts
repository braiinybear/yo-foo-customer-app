import { useState, useCallback } from 'react';

export interface GeocodeAddressResult {
  addressLine: string;
  landmark: string;
  lat: number;
  lng: number;
}

interface GoogleGeocodeResponse {
  results: {
    formatted_address: string;
    address_components: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
    geometry: {
      location: { lat: number; lng: number };
    };
  }[];
  status: string;
}

export function useReverseGeocode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<GeocodeAddressResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use the dedicated Geocoding key (no Android app restriction — REST calls need this)
        const apiKey = process.env.EXPO_PUBLIC_GEOCODING_API_KEY;
        console.log('[Geocode] API key present:', !!apiKey, '| Value:', apiKey);
        
        if (!apiKey) {
          console.error('[Geocode] No API key found in EXPO_PUBLIC_GEOCODING_API_KEY');
          throw new Error('Google Maps API key is not configured.');
        }
        console.log('[Geocode] Input lat/lng:', lat, lng);
        
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        console.log('[Geocode] Fetching URL:', url);
        const response = await fetch(url);
        console.log('[Geocode] HTTP status:', response.status);
        const json = await response.json() as GoogleGeocodeResponse & { error_message?: string };
        console.log('[Geocode] Raw response:', JSON.stringify(json));

        console.log('[Geocode] Status:', json.status, '| Results:', json.results?.length ?? 0);
        if (json.error_message) console.log('[Geocode] Error:', json.error_message);

        if (json.status !== 'OK' || json.results.length === 0) {
          console.error('[Geocode] Geocode failed:', json.status, json.error_message);
          throw new Error(`Geocode failed: ${json.status}${json.error_message ? ' – ' + json.error_message : ''}`);
        }

        const topResult = json.results[0];
        console.log('[Geocode] Address:', topResult.formatted_address);
        
        const components = topResult.address_components;

        // --- Extract specific components for the landmark field ---
        const getComponent = (type: string) =>
          components.find((c) => c.types.includes(type))?.long_name ?? '';

        const sublocality = getComponent('sublocality_level_1') || getComponent('sublocality');
        const neighborhood = getComponent('neighborhood');
        const landmark = sublocality || neighborhood || '';

        return {
          addressLine: topResult.formatted_address,
          landmark,
          lat,
          lng,
        };
      } catch (err: any) {
        const msg = err?.message ?? 'Reverse geocoding failed.';
        console.error('[Geocode] Exception:', err);
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { reverseGeocode, isLoading, error };
}
