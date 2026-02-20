import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Use your backend IP (avoid localhost for physical devices)
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Injects Better Auth Token
apiClient.interceptors.request.use(
    async (config) => {
        // Better Auth default key for Expo
        const token = await SecureStore.getItemAsync("token");
        console.log("Session Token:", token); // Temporary log for debugging

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handles 401 Unauthorized globally
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Logic for session expiration (e.g., redirect to login)
            console.error("Session expired or invalid.");
        }
        return Promise.reject(error);
    }
);

export default apiClient;