import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/typography';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function FavouriteLayout() {
    const { Colors, isDark } = useTheme();
    const router = useRouter();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: isDark ? Colors.background : Colors.secondary,
                },
                headerTintColor: Colors.white,
                headerTitleStyle: {
                    fontFamily: Fonts.brandBold,
                },
                headerShadowVisible: false,
                contentStyle: {
                    backgroundColor: Colors.background,
                },
                 headerTitleAlign: 'center',
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.push("/(tabs)");
                            }
                        }}
                        activeOpacity={0.7}
                        style={{ paddingLeft: 1, paddingRight: 12, height: 44, justifyContent: 'center' }}
                    >
                        <MaterialCommunityIcons name="keyboard-backspace" size={28} color={Colors.white} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'My Favorites',
                }}
            />
        </Stack>
    );
}
