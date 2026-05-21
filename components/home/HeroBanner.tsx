import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
import {
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    SharedValue,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface BannerSlide {
    id: string;
    title: string;
    subtitle: string;
    ctaText: string;
    backgroundColor: string;
    accentColor: string;
}

// Static slides – swap for real images/data from API later
const SLIDES: BannerSlide[] = [
    {
        id: "1",
        title: "🍛 Weekend Special",
        subtitle: "Up to 40% off on North Indian cuisine",
        ctaText: "Explore now →",
        backgroundColor: "#1a5276",
        accentColor: "#F39C12",
    },
    {
        id: "2",
        title: "⚡ Near & Fast",
        subtitle: "Free delivery on orders above ₹199",
        ctaText: "Order now →",
        backgroundColor: "#145a32",
        accentColor: "#2ECC71",
    },
    {
        id: "3",
        title: "🍕 Pizza Fiesta",
        subtitle: "Flat ₹120 OFF on all pizza orders",
        ctaText: "Grab deal →",
        backgroundColor: "#7b241c",
        accentColor: "#E74C3C",
    },
    {
        id: "4",
        title: "🧆 Biryani Blast",
        subtitle: "Buy 2 get 1 free – today only!",
        ctaText: "Explore now →",
        backgroundColor: "#4a235a",
        accentColor: "#8E44AD",
    },
];

// Extracted Dot component — avoids hooks-inside-render violation
const Dot = memo(({ dotWidth, isActive, onPress, dotStyle, activeColor, inactiveColor }: {
    dotWidth: SharedValue<number>;
    isActive: boolean;
    onPress: () => void;
    dotStyle: any;
    activeColor: string;
    inactiveColor: string;
}) => {
    const animStyle = useAnimatedStyle(() => ({
        width: dotWidth.value,
    }));

    return (
        <TouchableOpacity onPress={onPress}>
            <Animated.View
                style={[
                    dotStyle,
                    animStyle,
                    { backgroundColor: isActive ? activeColor : inactiveColor },
                ]}
            />
        </TouchableOpacity>
    );
});

export default function HeroBanner() {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const isUserScrolling = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fixed number of dots — create shared values at top level (hooks rules safe)
    const dot0 = useSharedValue(20);
    const dot1 = useSharedValue(6);
    const dot2 = useSharedValue(6);
    const dot3 = useSharedValue(6);
    const dotSharedValues = useRef([dot0, dot1, dot2, dot3]).current;

    // Animate dots on UI thread whenever activeIndex changes
    useEffect(() => {
        dotSharedValues.forEach((sv, i) => {
            sv.value = withSpring(i === activeIndex ? 20 : 6, {
                damping: 15,
                stiffness: 200,
            });
        });
    }, [activeIndex]);

    const goToSlide = useCallback((index: number) => {
        scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
        setActiveIndex(index);
    }, []);

    const startAutoSlide = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (!isUserScrolling.current) {
                setActiveIndex((prev) => {
                    const next = (prev + 1) % SLIDES.length;
                    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
                    return next;
                });
            }
        }, 3000);
    }, []);

    // Start auto-slide on mount, clear on unmount
    useEffect(() => {
        startAutoSlide();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startAutoSlide]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    }, []);

    const handleDragStart = useCallback(() => {
        isUserScrolling.current = true;
        // Pause the timer while user is manually swiping
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const handleDragEnd = useCallback(() => {
        isUserScrolling.current = false;
        // Restart timer after user finishes swiping
        startAutoSlide();
    }, [startAutoSlide]);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                onScrollBeginDrag={handleDragStart}
                onScrollEndDrag={handleDragEnd}
            >
                {SLIDES.map((slide) => (
                    <View key={slide.id} style={[styles.slide, { backgroundColor: slide.backgroundColor }]}>
                        {/* Decorative circles */}
                        <View style={[styles.decorCircle, styles.decorCircleLarge, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
                        <View style={[styles.decorCircle, styles.decorCircleSmall, { backgroundColor: "rgba(255,255,255,0.05)" }]} />
                        <View style={[styles.decorCircle, styles.decorCircleTiny, { backgroundColor: "rgba(255,255,255,0.04)" }]} />

                        <View style={styles.slideContent}>
                            <Text style={styles.slideTitle}>{slide.title}</Text>
                            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                            <TouchableOpacity
                                style={[styles.ctaButton, { backgroundColor: slide.accentColor }]}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.ctaText}>{slide.ctaText}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Dot indicators */}
            <View style={styles.dotsRow}>
                {SLIDES.map((_, i) => (
                    <Dot
                        key={i}
                        dotWidth={dotSharedValues[i]}
                        isActive={i === activeIndex}
                        onPress={() => goToSlide(i)}
                        dotStyle={styles.dot}
                        activeColor={Colors.primary}
                        inactiveColor={Colors.border}
                    />
                ))}
            </View>
        </View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        marginBottom: 8,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: 200,
        overflow: "hidden",
        justifyContent: "flex-end",
    },
    decorCircle: {
        position: "absolute",
        borderRadius: 999,
    },
    decorCircleLarge: {
        width: 220,
        height: 220,
        right: -60,
        top: -60,
    },
    decorCircleSmall: {
        width: 140,
        height: 140,
        right: 30,
        bottom: -40,
    },
    decorCircleTiny: {
        width: 80,
        height: 80,
        left: -20,
        top: 20,
    },
    slideContent: {
        padding: 24,
        paddingBottom: 28,
    },
    slideTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.white,
        marginBottom: 6,
    },
    slideSubtitle: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: "rgba(255,255,255,0.85)",
        marginBottom: 14,
    },
    ctaButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 24,
    },
    ctaText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 10,
        gap: 5,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 20,
        backgroundColor: Colors.primary,
    },
    dotInactive: {
        width: 6,
        backgroundColor: Colors.border,
    },
});
