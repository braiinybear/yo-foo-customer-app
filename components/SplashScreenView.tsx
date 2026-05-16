import { useTheme } from "@/context/ThemeContext";
import { Fonts } from "@/constants/typography";
import React, { useEffect } from "react";
import { StyleSheet, Image } from "react-native";
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring, 
    withDelay, 
    runOnJS,
    withSequence
} from "react-native-reanimated";

export default function SplashScreenView({
    onFinish,
}: {
    onFinish: () => void;
}) {
    const { Colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    
    const logoScale = useSharedValue(0.3);
    const logoOpacity = useSharedValue(0);
    const screenOpacity = useSharedValue(1);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: screenOpacity.value,
    }));

    useEffect(() => {
        // Entrance Sequence
        logoOpacity.value = withTiming(1, { duration: 600 });
        logoScale.value = withSpring(1, { damping: 20, stiffness: 80, mass: 1 });

        // Exit Sequence
        const finish = () => {
            screenOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
                if (finished) {
                    runOnJS(onFinish)();
                }
            });
        };

        const timer = setTimeout(finish, 1800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={[styles.logoWrapper, logoStyle]}>
                <Image
                    source={require("@/assets/images/app-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
    },
    logoWrapper: {
        marginBottom: 16,
    },
    logo: {
        width: 160,
        height: 160,
    },
    appName: {
        fontFamily: Fonts.brandBlack,
        fontSize: 36,
        color: Colors.primary,
        letterSpacing: 1,
    },
    tagline: {
        fontFamily: Fonts.brandMedium,
        fontSize: 15,
        color: Colors.textSecondary,
        marginTop: 8,
    },
});
