import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';

interface LoadingLottieProps {
    message?: string;
    fullScreen?: boolean;
}

const { width } = Dimensions.get('window');

export default function LoadingLottie({ message = "Cooking up something delicious...", fullScreen = false }: LoadingLottieProps) {
    const { Colors } = useTheme();

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <View style={styles.lottieWrapper}>
                <LottieView
                    source={require('@/assets/lotties/loading-Indicators/Food.json')}
                    autoPlay
                    loop
                    style={styles.lottie}
                />
            </View>
            {message && (
                <Text style={[styles.message, { color: Colors.textSecondary }]}>
                    {message}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    fullScreen: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
    },
    lottieWrapper: {
        width: width * 0.5,
        height: width * 0.5,
        marginBottom: 10,
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
    message: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        textAlign: 'center',
        marginTop: 10,
    },
});
