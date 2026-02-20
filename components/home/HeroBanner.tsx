import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

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

export default function HeroBanner() {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const isUserScrolling = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // One Animated.Value per dot for smooth width spring
    const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 18 : 6))).current;

    // Spring-animate dots whenever activeIndex changes
    useEffect(() => {
        SLIDES.forEach((_, i) => {
            Animated.spring(dotAnims[i], {
                toValue: i === activeIndex ? 18 : 6,
                useNativeDriver: false,
                speed: 20,
                bounciness: 4,
            }).start();
        });
    }, [activeIndex]);

    const goToSlide = (index: number) => {
        scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
        setActiveIndex(index);
    };

    const startAutoSlide = () => {
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
    };

    // Start auto-slide on mount, clear on unmount
    useEffect(() => {
        startAutoSlide();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    };

    const handleDragStart = () => {
        isUserScrolling.current = true;
        // Pause the timer while user is manually swiping
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const handleDragEnd = () => {
        isUserScrolling.current = false;
        // Restart timer after user finishes swiping
        startAutoSlide();
    };

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
                        <View style={[styles.decorCircle, styles.decorCircleLarge, { backgroundColor: "rgba(255,255,255,0.07)" }]} />
                        <View style={[styles.decorCircle, styles.decorCircleSmall, { backgroundColor: "rgba(255,255,255,0.05)" }]} />

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
                    <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
                        <Animated.View
                            style={[
                                styles.dot,
                                {
                                    width: dotAnims[i],
                                    backgroundColor: i === activeIndex ? Colors.primary : Colors.border,
                                },
                            ]}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    slide: {
        width: SCREEN_WIDTH,
        height: 180,
        overflow: "hidden",
        justifyContent: "flex-end",
    },
    decorCircle: {
        position: "absolute",
        borderRadius: 999,
    },
    decorCircleLarge: {
        width: 200,
        height: 200,
        right: -50,
        top: -50,
    },
    decorCircleSmall: {
        width: 120,
        height: 120,
        right: 40,
        bottom: -30,
    },
    slideContent: {
        padding: 20,
        paddingBottom: 24,
    },
    slideTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.white,
        marginBottom: 4,
    },
    slideSubtitle: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: "rgba(255,255,255,0.85)",
        marginBottom: 12,
    },
    ctaButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
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
        paddingTop: 8,
        gap: 5,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 18,
        backgroundColor: Colors.primary,
    },
    dotInactive: {
        width: 6,
        backgroundColor: Colors.border,
    },
});
