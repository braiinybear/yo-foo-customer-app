import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Fonts } from '@/constants/typography';

export default function NotificationLayout() {
    const { Colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.background,
                },
                headerTintColor: Colors.text,
                headerTitleStyle: {
                    fontFamily: Fonts.brandBold,
                },
                headerShadowVisible: false,
                contentStyle: {
                    backgroundColor: Colors.background,
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Notifications',
                }}
            />
        </Stack>
    );
}
