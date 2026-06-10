import React from 'react';
import { StyleSheet, View, Text, FlatList, StatusBar } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import RestaurantCard from '@/components/home/RestaurantCard';
import { router } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function FavouriteScreen() {
    const { Colors, isDark } = useTheme();
    const favorites = useFavoritesStore((state) => state.favorites);

    const handleExplore = () => {
        router.push('/(tabs)');
    };

    if (favorites.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: Colors.background }, styles.center]}>
                <Animated.View 
                    entering={FadeInDown.duration(400)}
                    style={styles.emptyContainer}
                >
                    <View style={[styles.iconWrapper, { backgroundColor: Colors.primary + '15' }]}>
                        <Ionicons name="heart-dislike-outline" size={64} color={Colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: Colors.text }]}>No Favorites Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: Colors.textSecondary }]}>
                        Explore restaurants and tap the bookmark icon to save your favorites here.
                    </Text>
                    <AnimatedPressable 
                        style={[styles.exploreBtn, { backgroundColor: Colors.primary }]}
                        onPress={handleExplore}
                        scaleIn={0.95}
                    >
                        <Text style={[styles.exploreBtnText, { color: isDark ? Colors.secondary : Colors.white }]}>
                            Explore Restaurants
                        </Text>
                    </AnimatedPressable>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <Animated.View
                        entering={FadeInDown.delay(index * 50).duration(300)}
                        needsOffscreenAlphaCompositing={true}
                        style={styles.cardContainer}
                    >
                        <RestaurantCard
                            restaurant={item}
                            onPress={() =>
                                router.push({
                                    pathname: "/restaurants/[id]",
                                    params: { id: item.id },
                                })
                            }
                        />
                    </Animated.View>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    iconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg + 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    exploreBtn: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    exploreBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    cardContainer: {
        width: '100%',
    },
});
