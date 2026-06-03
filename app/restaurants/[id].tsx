import { useTheme } from "@/context/ThemeContext";
import { Fonts, FontSize } from "@/constants/typography";
import { getPlaceholderImage } from "@/constants/images";
import { useRestaurantDetail } from "@/hooks/useRestaurants";
import { useCartStore } from "@/store/useCartStore";
import { useVegTypeStore } from "@/store/useVegTypeStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Modal,
    TextInput,
    Share,
    Linking,
} from "react-native";
import { showAlert } from "@/store/useAlertStore";
import { MenuCategory, MenuItem, MenuVariant, AddonGroup, AddonOption } from "@/types/restaurants";
import Animated, {
    SlideInDown,
    SlideOutDown,
    FadeInDown,
    FadeOutUp,
    Layout,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    Extrapolation,
    withSpring,
} from "react-native-reanimated";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useToastStore } from "@/store/useToastStore";
import LoadingLottie from "@/components/LoadingLottie";
import RestaurantDetailSkeleton from "@/components/loadingSkelton/RestaurantDetailSkeleton";

export default function RestaurantDetailScreen() {
    const { Colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
    const { id, menuItemName, menuItemId } = useLocalSearchParams<{ id: string; menuItemName?: string; menuItemId?: string }>();
    const insets = useSafeAreaInsets();
    
    // Fetch dynamic restaurant details
    const { data: fetchedRestaurant, isPending, error, refetch } = useRestaurantDetail(id);
    const showToast = useToastStore((state) => state.showToast);

    // Merge API data with requested fallback/provided JSON
    const restaurant = useMemo(() => {
        if (!fetchedRestaurant) return null;
        return {
            ...fetchedRestaurant,
            address: fetchedRestaurant.address || "Mussoorie Road, Dehradun",
            description: fetchedRestaurant.description || "Traditional Indian sweets, Desi Ghee Jalebi, and spicy Samosa Chaat.",
            cuisineTypes: fetchedRestaurant.cuisineTypes?.length ? fetchedRestaurant.cuisineTypes : ["Sweets", "Chaat", "Street Food"],
            costForTwo: fetchedRestaurant.costForTwo || 250,
            rating: fetchedRestaurant.rating || 4.7,
            ratingCount: fetchedRestaurant.ratingCount || 0,
            isOpen: fetchedRestaurant.isOpen ?? true,
            isVerified: fetchedRestaurant.isVerified ?? true,
            distance: (fetchedRestaurant as any).distance || "9km",
            lat: fetchedRestaurant.lat ?? (fetchedRestaurant as any).latitude ?? 30.4214,
            lng: fetchedRestaurant.lng ?? (fetchedRestaurant as any).longitude ?? 78.0507,
        };
    }, [fetchedRestaurant]);

    const { addItem, items, updateQuantity, totalAmount } = useCartStore();
    const { selectedVegType } = useVegTypeStore();

    const [refreshing, setRefreshing] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState<"all" | "veg" | "non-veg" | "bestseller">("all");
    const [sortBy, setSortBy] = useState<"none" | "price-asc" | "price-desc">("none");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    
    // Sticky Accordion States
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const reviews = useMemo(() => {
        return (restaurant?.reviews || []).map((rev: any) => ({
            id: rev.id,
            userName: rev.user?.name || "Customer",
            userAvatar: rev.user?.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            rating: rev.foodRating,
            date: new Date(rev.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
            comment: rev.comment || "",
            photos: [],
            isVerified: true,
        }));
    }, [restaurant?.reviews]);

    // Customize Bottom Sheet Modal States
    const [selectedCustomizeItem, setSelectedCustomizeItem] = useState<MenuItem | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
    const [customizeQty, setCustomizeQty] = useState<number>(1);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

    // References for Scroll Navigation
    const scrollViewRef = useRef<any>(null);
    const categoryYRefs = useRef<{ [key: string]: number }>({});
    const menuContainerY = useRef<number>(0);
    const stickyBarY = useRef<number>(0);
    const [activeTabId, setActiveTabId] = useState<string>("");

    const scrollY = useSharedValue(0);
    const heartScale = useSharedValue(1);

    // Set initial expanded accordion categories
    useEffect(() => {
        if (restaurant?.menuCategories) {
            const initial: { [key: string]: boolean } = {};
            restaurant.menuCategories.forEach(cat => {
                initial[cat.id] = true;
            });
            setExpandedCategories(initial);
            if (restaurant.menuCategories.length > 0) {
                setActiveTabId(restaurant.menuCategories[0].id);
            }
        }
    }, [restaurant]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleClearCart = useCallback(() => {
        showAlert(
            'Clear Cart',
            'Are you sure you want to remove all items from your cart?',
            [
                {
                    text: 'Cancel',
                    onPress: () => { },
                    style: 'cancel',
                },
                {
                    text: 'Clear',
                    onPress: () => {
                        useCartStore.setState({ items: [] });
                    },
                    style: 'destructive',
                },
            ]
        );
    }, []);

    // Helper functions for new variant/addon structures
    const getItemStartingPrice = useCallback((item: MenuItem | null): number => {
        if (!item) return 0;
        if (item.variants && item.variants.length > 0) {
            const defaultVariant = item.variants.find(v => v.isDefault) ?? item.variants[0];
            return defaultVariant.price;
        }
        return item.price ?? 0;
    }, []);

    const isCustomizable = useCallback((item: MenuItem | null): boolean => {
        if (!item) return false;
        return (item.variants && item.variants.length > 1) || (item.addons && item.addons.length > 0);
    }, []);

    const handleAddPress = useCallback((item: MenuItem) => {
        if (isCustomizable(item)) {
            setSelectedCustomizeItem(item);

            // Set default variant
            const defaultVar = item.variants?.find(v => v.isDefault) ?? item.variants?.[0] ?? null;
            setSelectedVariant(defaultVar);

            // Auto pre-select required addons (minSelect >= 1)
            const preselectedAddons: AddonOption[] = [];
            item.addons?.forEach(group => {
                if (group.minSelect >= 1 && group.options?.length > 0) {
                    preselectedAddons.push(group.options[0]);
                }
            });
            setSelectedAddons(preselectedAddons);
            setCustomizeQty(1);
        } else {
            addItem(item, restaurant!.id);
            showToast(`${item.name} added to cart`, 'success');
        }
    }, [restaurant?.id, addItem, showToast, isCustomizable]);

    const handleToggleAddon = useCallback((group: AddonGroup, option: AddonOption) => {
        setSelectedAddons(prev => {
            const isSelected = prev.some(o => o.id === option.id);

            if (isSelected) {
                return prev.filter(o => o.id !== option.id);
            } else {
                // If single-select group
                if (group.maxSelect === 1) {
                    const filtered = prev.filter(o => o.addonGroupId !== group.id);
                    return [...filtered, option];
                }

                // If multi-select, check limit
                const groupSelections = prev.filter(o => o.addonGroupId === group.id);
                if (groupSelections.length < group.maxSelect) {
                    return [...prev, option];
                }

                // Replace oldest selection if limit reached
                if (groupSelections.length > 0) {
                    const oldestId = groupSelections[0].id;
                    const filtered = prev.filter(o => o.id !== oldestId);
                    return [...filtered, option];
                }

                return prev;
            }
        });
    }, []);

    const matchesVegType = (itemType: string | null): boolean => {
        if (!selectedVegType) return true;
        if (!itemType) return false;

        if (selectedVegType === "non-veg") {
            return itemType === "NON_VEG" || itemType === "VEG";
        }

        return itemType === "VEG";
    };

    const cartCount = items.length;
    const cartTotal = totalAmount;
    const cartBannerBottom = Math.max(insets.bottom + 8, 24);

    // Share Handler
    const handleShare = async () => {
        if (!restaurant) return;
        try {
            await Share.share({
                message: `Order delicious food from "${restaurant.name}" on Yo!Foo! 🍕🍔\nCuisines: ${restaurant.cuisineTypes.join(", ")}\nRating: ⭐ ${restaurant.rating}\nAddress: ${restaurant.address}`,
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    // Favorite/Like Action with Spring Animation
    const handleFavoritePress = () => {
        setIsLiked(prev => !prev);
        heartScale.value = 0.6;
        heartScale.value = withSpring(1.2, { damping: 4, stiffness: 200 }, () => {
            heartScale.value = withSpring(1);
        });
        showToast(!isLiked ? "Added to Favorites ♥" : "Removed from Favorites", "success");
    };

    // Scroll Handler for Parallax / Sticky Headers
    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const bannerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: interpolate(
                        scrollY.value,
                        [-260, 0, 260],
                        [-260 / 2, 0, 260 * 0.75],
                        Extrapolation.CLAMP
                    ),
                },
                {
                    scale: interpolate(
                        scrollY.value,
                        [-260, 0],
                        [1.5, 1],
                        Extrapolation.CLAMP
                    ),
                },
            ],
        };
    });

    // Fade-in header color based on scroll offset
    const headerBgAnimatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: Colors.background,
            opacity: interpolate(
                scrollY.value,
                [100, 220],
                [0, 1],
                Extrapolation.CLAMP
            ),
        };
    });

    const headerTextAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                scrollY.value,
                [160, 220],
                [0, 1],
                Extrapolation.CLAMP
            ),
        };
    });

    const heartAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: heartScale.value }]
        };
    });

    const cartPulse = useSharedValue(1);

    useEffect(() => {
        if (cartCount > 0) {
            cartPulse.value = 1.05;
            cartPulse.value = withSpring(1, { damping: 10, stiffness: 220 });
        }
    }, [cartCount]);

    const cartPulseStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: cartPulse.value }],
        };
    });

    const stickyHeaderAnimatedStyle = useAnimatedStyle(() => {
        const stickyPoint = stickyBarY.current > 0 ? (stickyBarY.current - (56 + insets.top)) : 420;
        const opacity = interpolate(
            scrollY.value,
            [stickyPoint - 10, stickyPoint],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            transform: [
                {
                    scale: interpolate(
                        scrollY.value,
                        [stickyPoint - 10, stickyPoint],
                        [0.97, 1],
                        Extrapolation.CLAMP
                    ),
                },
            ],
            pointerEvents: scrollY.value > stickyPoint ? "auto" : "none",
        };
    });

    const inlineHeaderAnimatedStyle = useAnimatedStyle(() => {
        const stickyPoint = stickyBarY.current > 0 ? (stickyBarY.current - (56 + insets.top)) : 420;
        const opacity = interpolate(
            scrollY.value,
            [stickyPoint - 10, stickyPoint],
            [1, 0],
            Extrapolation.CLAMP
        );
        return {
            opacity,
        };
    });

    const menuFabAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [150, 200],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            transform: [
                {
                    scale: interpolate(
                        scrollY.value,
                        [150, 200],
                        [0.8, 1],
                        Extrapolation.CLAMP
                    ),
                },
            ],
        };
    });

    // Get Directions and Open in Google Maps
    const handleGetDirections = () => {
        if (!restaurant) return;
        const lat = restaurant.lat;
        const lng = restaurant.lng;
        const url = Platform.select({
            ios: `maps://app?daddr=${lat},${lng}&label=${encodeURIComponent(restaurant.name)}`,
            android: `google.navigation:q=${lat},${lng}`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        });
        Linking.openURL(url!).catch(() => {
            showToast("Could not open maps application.", "error");
        });
    };



    // Similar cuisines/restaurants carousel data
    const similarRestaurants = useMemo(() => {
        return [
            {
                id: "sim-1",
                name: "Sardarji Malai Chaat Corner",
                cuisineTypes: ["Chaat", "Street Food"],
                rating: 4.6,
                costForTwo: 180,
                distance: "3.4km",
                image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=300"
            },
            {
                id: "sim-2",
                name: "Kwality Sweets & Restaurant",
                cuisineTypes: ["Sweets", "Street Food"],
                rating: 4.5,
                costForTwo: 300,
                distance: "2.1km",
                image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300"
            },
            {
                id: "sim-3",
                name: "Bikanervala Dehradun",
                cuisineTypes: ["Sweets", "Chaat"],
                rating: 4.4,
                costForTwo: 400,
                distance: "4.8km",
                image: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=300"
            }
        ];
    }, []);

    // Filtered menu items calculation
    const filteredCategories = useMemo(() => {
        if (!restaurant?.menuCategories) return [];

        return restaurant.menuCategories.map(category => {
            const items = category.items.filter(item => {
                // Veg Type filter (from store)
                if (!matchesVegType(item.type)) return false;

                // Tab Filter
                if (selectedFilter === "veg" && item.type !== "VEG") return false;
                if (selectedFilter === "non-veg" && item.type !== "NON_VEG") return false;
                if (selectedFilter === "bestseller" && !item.isBestseller) return false;

                // Search Query
                if (searchQuery.trim() !== "") {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = item.name.toLowerCase().includes(q);
                    const descMatch = item.description?.toLowerCase().includes(q) || false;
                    const catMatch = category.name.toLowerCase().includes(q);
                    return nameMatch || descMatch || catMatch;
                }

                return true;
            });

            // Apply price sorting if active
            const sortedItems = [...items].sort((a, b) => {
                if (sortBy === "price-asc") {
                    return getItemStartingPrice(a) - getItemStartingPrice(b);
                }
                if (sortBy === "price-desc") {
                    return getItemStartingPrice(b) - getItemStartingPrice(a);
                }
                return 0;
            });

            return {
                ...category,
                items: sortedItems
            };
        }).filter(category => category.items.length > 0);
    }, [restaurant?.menuCategories, searchQuery, selectedFilter, sortBy, selectedVegType, getItemStartingPrice]);

    // Curated Popular/Bestseller Menu Items
    const popularItems = useMemo(() => {
        if (!restaurant?.menuCategories) return [];
        const all: MenuItem[] = [];
        restaurant.menuCategories.forEach(cat => {
            cat.items.forEach(item => {
                all.push(item);
            });
        });
        const bestsellers = all.filter(item => item.isBestseller);
        return bestsellers.length > 0 ? bestsellers : all.slice(0, 4);
    }, [restaurant]);

    const scrollToCategory = (catId: string) => {
        setActiveTabId(catId);
        const yOffset = categoryYRefs.current[catId];
        if (yOffset !== undefined && scrollViewRef.current) {
            // Scroll to the absolute coordinate: menuContainer Y position + category relative Y position
            // Shift offset by top header (56 + insets.top) and absolute sticky bar height (~150)
            const targetY = menuContainerY.current + yOffset - (56 + insets.top + 150);
            scrollViewRef.current.scrollTo({ y: Math.max(0, targetY), animated: true });
        }
    };

    if (isPending) {
        return <RestaurantDetailSkeleton />;
    }

    if (error || !restaurant) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="wifi-outline" size={60} color={Colors.primary} style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>No Internet or failed to load restaurant details.</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.push("/(tabs)");
                        }
                    }}
                >
                    <Text style={styles.retryText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isClosedBannerVisible = !restaurant.isOpen;

    return (
        <View style={styles.container}>
            {/* Beautiful Transparent/Sticky Parallax Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <Animated.View style={[styles.headerBg, headerBgAnimatedStyle]} />
                <View style={styles.headerRow}>
                    <AnimatedPressable
                        style={styles.backButton}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.push("/(tabs)");
                            }
                        }}
                        scaleIn={0.85}
                    >
                        <Ionicons name="arrow-back" size={22} color={isDark ? Colors.white : Colors.secondary} />
                    </AnimatedPressable>
                    
                    <Animated.View style={[styles.headerNameContainer, headerTextAnimatedStyle]}>
                        <Text style={styles.headerRestaurantName} numberOfLines={1}>
                            {restaurant.name}
                        </Text>
                    </Animated.View>

                    <View style={styles.headerRightActions}>
                        <AnimatedPressable
                            style={styles.headerIconBtn}
                            onPress={handleShare}
                            scaleIn={0.85}
                        >
                            <Ionicons name="share-outline" size={22} color={isDark ? Colors.white : Colors.secondary} />
                        </AnimatedPressable>
                        
                        <AnimatedPressable
                            style={styles.headerIconBtn}
                            onPress={handleFavoritePress}
                            scaleIn={0.85}
                        >
                            <Animated.View style={heartAnimatedStyle}>
                                <Ionicons
                                    name={isLiked ? "heart" : "heart-outline"}
                                    size={22}
                                    color={isLiked ? Colors.danger : (isDark ? Colors.white : Colors.secondary)}
                                />
                            </Animated.View>
                        </AnimatedPressable>
                    </View>
                </View>
            </View>

            {/* Absolute Sticky Search & Category Bar (Zomato/Swiggy-inspired smooth fade-in) */}
            <Animated.View style={[
                styles.absoluteStickyBar,
                { top: 56 + insets.top },
                stickyHeaderAnimatedStyle
            ]}>
                <View style={styles.searchBarWrapper}>
                    <Ionicons name="search" size={20} color={Colors.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search dishes, desserts or chaat..."
                        placeholderTextColor={Colors.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color={Colors.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Quick Selector Row */}
                <View style={{ position: "relative", zIndex: 100 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterChipsRow}
                    >
                        <AnimatedPressable
                            style={[styles.filterChip, selectedFilter === "all" && sortBy === "none" && styles.filterChipActive]}
                            onPress={() => {
                                setSelectedFilter("all");
                                setSortBy("none");
                                setShowSortDropdown(false);
                            }}
                            scaleIn={0.95}
                        >
                            <Text style={[styles.filterChipText, selectedFilter === "all" && sortBy === "none" && styles.filterChipTextActive]}>
                                All Items
                            </Text>
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={[styles.filterChip, sortBy !== "none" && styles.filterChipActive]}
                            onPress={() => setShowSortDropdown(prev => !prev)}
                            scaleIn={0.95}
                        >
                            <Ionicons name="swap-vertical" size={12} color={sortBy !== "none" ? Colors.white : Colors.primary} />
                            <Text style={[styles.filterChipText, sortBy !== "none" && styles.filterChipTextActive]}>
                                {sortBy === "price-asc" ? "Price: L to H" : sortBy === "price-desc" ? "Price: H to L" : "Sort"}
                            </Text>
                            <Ionicons name={showSortDropdown ? "chevron-up" : "chevron-down"} size={10} color={sortBy !== "none" ? Colors.white : Colors.muted} style={{ marginLeft: 2 }} />
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={[styles.filterChip, selectedFilter === "veg" && styles.filterChipActive]}
                            onPress={() => {
                                setSelectedFilter("veg");
                                setShowSortDropdown(false);
                            }}
                            scaleIn={0.95}
                        >
                            <View style={[styles.dot, { backgroundColor: "#27ae60" }]} />
                            <Text style={[styles.filterChipText, selectedFilter === "veg" && styles.filterChipTextActive]}>
                                Veg Only
                            </Text>
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={[styles.filterChip, selectedFilter === "non-veg" && styles.filterChipActive]}
                            onPress={() => {
                                setSelectedFilter("non-veg");
                                setShowSortDropdown(false);
                            }}
                            scaleIn={0.95}
                        >
                            <View style={[styles.dot, { backgroundColor: "#e74c3c" }]} />
                            <Text style={[styles.filterChipText, selectedFilter === "non-veg" && styles.filterChipTextActive]}>
                                Non-Veg
                            </Text>
                        </AnimatedPressable>

                        <AnimatedPressable
                            style={[styles.filterChip, selectedFilter === "bestseller" && styles.filterChipActive]}
                            onPress={() => {
                                setSelectedFilter("bestseller");
                                setShowSortDropdown(false);
                            }}
                            scaleIn={0.95}
                        >
                            <Ionicons name="star" size={12} color={selectedFilter === "bestseller" ? Colors.white : Colors.primary} />
                            <Text style={[styles.filterChipText, selectedFilter === "bestseller" && styles.filterChipTextActive]}>
                                Bestsellers
                            </Text>
                        </AnimatedPressable>
                    </ScrollView>

                    {/* Price Sorting Dropdown Box */}
                    {showSortDropdown && (
                        <View style={styles.sortDropdownContainer}>
                            <TouchableOpacity 
                                style={[styles.sortDropdownOption, sortBy === "none" && styles.sortDropdownOptionActive]}
                                onPress={() => {
                                    setSortBy("none");
                                    setShowSortDropdown(false);
                                }}
                            >
                                <Ionicons name="reload-outline" size={14} color={sortBy === "none" ? Colors.primary : Colors.secondary} />
                                <Text style={[styles.sortDropdownText, sortBy === "none" && styles.sortDropdownTextActive]}>Relevance (Default)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.sortDropdownOption, sortBy === "price-asc" && styles.sortDropdownOptionActive]}
                                onPress={() => {
                                    setSortBy("price-asc");
                                    setShowSortDropdown(false);
                                }}
                            >
                                <Ionicons name="trending-up" size={14} color={sortBy === "price-asc" ? Colors.primary : Colors.secondary} />
                                <Text style={[styles.sortDropdownText, sortBy === "price-asc" && styles.sortDropdownTextActive]}>Price: Low to High</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.sortDropdownOption, sortBy === "price-desc" && styles.sortDropdownOptionActive]}
                                onPress={() => {
                                    setSortBy("price-desc");
                                    setShowSortDropdown(false);
                                }}
                            >
                                <Ionicons name="trending-down" size={14} color={sortBy === "price-desc" ? Colors.primary : Colors.secondary} />
                                <Text style={[styles.sortDropdownText, sortBy === "price-desc" && styles.sortDropdownTextActive]}>Price: High to Low</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </Animated.View>

            {/* Main Scroll Content */}
            <Animated.ScrollView
                ref={scrollViewRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
                removeClippedSubviews={Platform.OS === 'android'}
                overScrollMode="never"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
            >
                {/* 1. Parallax Restaurant Banner Image */}
                <Animated.View style={[styles.imageHeader, bannerAnimatedStyle]}>
                    <Image
                        source={{ uri: restaurant.image ?? getPlaceholderImage(restaurant.id) }}
                        style={styles.bannerImage}
                        contentFit="cover"
                    />
                    <View style={styles.bannerGradient} />
                </Animated.View>

                {/* 2. Restaurant Floating Details Card & Quick Info */}
                <View style={styles.detailsCardWrapper}>
                    {isClosedBannerVisible && (
                        <View style={styles.closedBanner}>
                            <Ionicons name="time" size={18} color={Colors.white} />
                            <Text style={styles.closedText}>Currently Closed. Accepting pre-orders only.</Text>
                        </View>
                    )}

                    <View style={styles.restaurantMainCard}>
                        <View style={styles.nameHeaderRow}>
                            <Text style={styles.restaurantTitle}>{restaurant.name}</Text>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        </View>

                        <Text style={styles.descriptionText}>{restaurant.description}</Text>

                        {/* Cuisine Chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cuisinesContainer}
                        >
                            {restaurant.cuisineTypes.map((cuisine, index) => {
                                let emoji = "🍛";
                                if (cuisine.toLowerCase().includes("sweet")) emoji = "🍬";
                                else if (cuisine.toLowerCase().includes("chaat")) emoji = "🌶";
                                else if (cuisine.toLowerCase().includes("street")) emoji = "🍢";
                                return (
                                    <View key={index} style={styles.cuisineChip}>
                                        <Text style={styles.cuisineEmoji}>{emoji}</Text>
                                        <Text style={styles.cuisineLabel}>{cuisine}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* Location and Timing bar */}
                        <View style={styles.locationTimingStrip}>
                            <View style={styles.stripItem}>
                                <Ionicons name="location" size={16} color={Colors.primary} />
                                <Text style={styles.stripText} numberOfLines={1}>{restaurant.address}</Text>
                            </View>
                            <View style={styles.stripDivider} />
                            <View style={styles.stripItem}>
                                <Ionicons name="time-outline" size={16} color={restaurant.isOpen ? Colors.success : Colors.muted} />
                                <Text style={[styles.stripText, { color: restaurant.isOpen ? Colors.success : Colors.muted }]}>
                                    {restaurant.isOpen ? "Open Now" : "Closed"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Horizontal Dynamic Scrolling Badges Row */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.badgesScrollRow}
                    >
                        <View style={styles.badgeChip}>
                            <Text style={styles.badgeEmoji}>⭐</Text>
                            <Text style={styles.badgeText}>Highly Rated</Text>
                        </View>
                        {restaurant.cuisineTypes.includes("Sweets") && (
                            <View style={styles.badgeChip}>
                                <Text style={styles.badgeEmoji}>🍬</Text>
                                <Text style={styles.badgeText}>Sweet Specialist</Text>
                            </View>
                        )}
                        {restaurant.cuisineTypes.includes("Chaat") && (
                            <View style={styles.badgeChip}>
                                <Text style={styles.badgeEmoji}>🌶</Text>
                                <Text style={styles.badgeText}>Chaat Expert</Text>
                            </View>
                        )}
                        {restaurant.costForTwo <= 300 && (
                            <View style={styles.badgeChip}>
                                <Text style={styles.badgeEmoji}>💸</Text>
                                <Text style={styles.badgeText}>Budget Friendly</Text>
                            </View>
                        )}
                        {restaurant.isVerified && (
                            <View style={styles.badgeChip}>
                                <Text style={styles.badgeEmoji}>✅</Text>
                                <Text style={styles.badgeText}>Verified Kitchen</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* AI Smart Recommendation Card */}
                    {/* <View style={styles.aiRecommendationCard}>
                        <View style={styles.aiCardHeader}>
                            <Ionicons name="sparkles" size={18} color={Colors.primary} />
                            <Text style={styles.aiHeaderTitle}>AI Taste Assistant Recommendation</Text>
                        </View>
                        <Text style={styles.aiCardBody}>
                            "Highly recommended destination in Dehradun for authentic evening snacks. Famous for rich Desi Ghee Jalebi and tangy street-style chaats. It scores a high value-for-money rating of 4.7 stars."
                        </Text>
                    </View> */}

                    {/* Key Metrics Stats Strip */}
                    <View style={styles.statsStripGrid}>
                        <View style={styles.statCard}>
                            <Ionicons name="star" size={20} color={Colors.primary} />
                            <Text style={styles.statValue}>{restaurant.rating}</Text>
                            <Text style={styles.statLabel}>{restaurant.ratingCount > 0 ? `${restaurant.ratingCount}+ reviews` : "Popular Spot"}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
                            <Text style={styles.statValue}>₹{restaurant.costForTwo}</Text>
                            <Text style={styles.statLabel}>For Two</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="restaurant-outline" size={20} color="#FFB800" />
                            <Text style={styles.statValue}>{restaurant.menuCategories?.length || 2}</Text>
                            <Text style={styles.statLabel}>Categories</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="navigate-outline" size={20} color="#00BCD4" />
                            <Text style={styles.statValue}>{restaurant.distance}</Text>
                            <Text style={styles.statLabel}>Distance</Text>
                        </View>
                    </View>
                </View>

                {/* 3. Sticky Search Bar and Category Navigation */}
                <Animated.View 
                    style={[styles.stickyBarContainer, inlineHeaderAnimatedStyle]}
                    onLayout={(event) => {
                        stickyBarY.current = event.nativeEvent.layout.y;
                    }}
                >
                    <View style={styles.searchBarWrapper}>
                        <Ionicons name="search" size={20} color={Colors.muted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search dishes, desserts or chaat..."
                            placeholderTextColor={Colors.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Ionicons name="close-circle" size={18} color={Colors.muted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter Quick Selector Row */}
                    <View style={{ position: "relative", zIndex: 100 }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterChipsRow}
                        >
                            <AnimatedPressable
                                style={[styles.filterChip, selectedFilter === "all" && sortBy === "none" && styles.filterChipActive]}
                                onPress={() => {
                                    setSelectedFilter("all");
                                    setSortBy("none");
                                    setShowSortDropdown(false);
                                }}
                                scaleIn={0.95}
                            >
                                <Text style={[styles.filterChipText, selectedFilter === "all" && sortBy === "none" && styles.filterChipTextActive]}>
                                    All Items
                                </Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={[styles.filterChip, sortBy !== "none" && styles.filterChipActive]}
                                onPress={() => setShowSortDropdown(prev => !prev)}
                                scaleIn={0.95}
                            >
                                <Ionicons name="swap-vertical" size={12} color={sortBy !== "none" ? Colors.white : Colors.primary} />
                                <Text style={[styles.filterChipText, sortBy !== "none" && styles.filterChipTextActive]}>
                                    {sortBy === "price-asc" ? "Price: L to H" : sortBy === "price-desc" ? "Price: H to L" : "Sort"}
                                </Text>
                                <Ionicons name={showSortDropdown ? "chevron-up" : "chevron-down"} size={10} color={sortBy !== "none" ? Colors.white : Colors.muted} style={{ marginLeft: 2 }} />
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={[styles.filterChip, selectedFilter === "veg" && styles.filterChipActive]}
                                onPress={() => {
                                    setSelectedFilter("veg");
                                    setShowSortDropdown(false);
                                }}
                                scaleIn={0.95}
                            >
                                <View style={[styles.dot, { backgroundColor: "#27ae60" }]} />
                                <Text style={[styles.filterChipText, selectedFilter === "veg" && styles.filterChipTextActive]}>
                                    Veg Only
                                </Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={[styles.filterChip, selectedFilter === "non-veg" && styles.filterChipActive]}
                                onPress={() => {
                                    setSelectedFilter("non-veg");
                                    setShowSortDropdown(false);
                                }}
                                scaleIn={0.95}
                            >
                                <View style={[styles.dot, { backgroundColor: "#e74c3c" }]} />
                                <Text style={[styles.filterChipText, selectedFilter === "non-veg" && styles.filterChipTextActive]}>
                                    Non-Veg
                                </Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                style={[styles.filterChip, selectedFilter === "bestseller" && styles.filterChipActive]}
                                onPress={() => {
                                    setSelectedFilter("bestseller");
                                    setShowSortDropdown(false);
                                }}
                                scaleIn={0.95}
                            >
                                <Ionicons name="star" size={12} color={selectedFilter === "bestseller" ? Colors.white : Colors.primary} />
                                <Text style={[styles.filterChipText, selectedFilter === "bestseller" && styles.filterChipTextActive]}>
                                    Bestsellers
                                </Text>
                            </AnimatedPressable>
                        </ScrollView>

                        {/* Price Sorting Dropdown Box */}
                        {showSortDropdown && (
                            <View style={styles.sortDropdownContainer}>
                                <TouchableOpacity 
                                    style={[styles.sortDropdownOption, sortBy === "none" && styles.sortDropdownOptionActive]}
                                    onPress={() => {
                                        setSortBy("none");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    <Ionicons name="reload-outline" size={14} color={sortBy === "none" ? Colors.primary : Colors.secondary} />
                                    <Text style={[styles.sortDropdownText, sortBy === "none" && styles.sortDropdownTextActive]}>Relevance (Default)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sortDropdownOption, sortBy === "price-asc" && styles.sortDropdownOptionActive]}
                                    onPress={() => {
                                        setSortBy("price-asc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    <Ionicons name="trending-up" size={14} color={sortBy === "price-asc" ? Colors.primary : Colors.secondary} />
                                    <Text style={[styles.sortDropdownText, sortBy === "price-asc" && styles.sortDropdownTextActive]}>Price: Low to High</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sortDropdownOption, sortBy === "price-desc" && styles.sortDropdownOptionActive]}
                                    onPress={() => {
                                        setSortBy("price-desc");
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    <Ionicons name="trending-down" size={14} color={sortBy === "price-desc" ? Colors.primary : Colors.secondary} />
                                    <Text style={[styles.sortDropdownText, sortBy === "price-desc" && styles.sortDropdownTextActive]}>Price: High to Low</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                </Animated.View>

                {/* 4. Curated Chef's Specials Featured Slider */}
                {popularItems.length > 0 && !searchQuery && (
                    <View style={styles.featuredSection}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>🔥 Chef's Recommended</Text>
                                <Text style={styles.sectionSubtitle}>Most loved dishes at this outlet</Text>
                            </View>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.featuredSliderContainer}
                        >
                            {popularItems.map((item) => {
                                const customizable = isCustomizable(item);
                                const matchingCartItems = items.filter((i) => i.id === item.id);
                                const cartItemTotalQty = matchingCartItems.reduce((sum, i) => sum + i.quantity, 0);
                                const hasInCart = matchingCartItems.length > 0;
                                return (
                                    <View key={item.id} style={styles.featuredItemCard}>
                                        <Image
                                            source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                                            style={styles.featuredItemImage}
                                            contentFit="cover"
                                        />
                                        <View style={styles.featuredItemInfo}>
                                            <View style={styles.vegIndicatorRow}>
                                                <Ionicons
                                                    name="caret-up-circle"
                                                    size={14}
                                                    color={item.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                                />
                                                <Text style={styles.featuredTagText}>BESTSELLER</Text>
                                            </View>
                                            <Text style={styles.featuredItemName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.featuredItemPrice}>₹{getItemStartingPrice(item)}</Text>
                                            
                                            {/* ADD / Quantity controller */}
                                            <View style={styles.featuredActionBtnWrapper}>
                                                {hasInCart ? (
                                                    <View style={[styles.quantityControls, { width: 90, height: 32 }]}>
                                                        <AnimatedPressable
                                                            onPress={() => {
                                                                const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                                updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity - 1);
                                                            }}
                                                            style={styles.qtyBtn}
                                                            scaleIn={0.8}
                                                        >
                                                            <Ionicons name="remove" size={14} color={Colors.primary} />
                                                        </AnimatedPressable>
                                                        <Text style={styles.qtyText}>{cartItemTotalQty}</Text>
                                                        <AnimatedPressable
                                                            onPress={() => {
                                                                if (customizable) {
                                                                    handleAddPress(item);
                                                                } else {
                                                                    const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                                    updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity + 1);
                                                                }
                                                            }}
                                                            style={styles.qtyBtn}
                                                            scaleIn={0.8}
                                                        >
                                                            <Ionicons name="add" size={14} color={Colors.primary} />
                                                        </AnimatedPressable>
                                                    </View>
                                                ) : (
                                                    <AnimatedPressable
                                                        style={[styles.addButton, { width: 90, height: 32 }]}
                                                        onPress={() => handleAddPress(item)}
                                                        scaleIn={0.9}
                                                    >
                                                        <Text style={[styles.addButtonText, { fontSize: 12 }]}>ADD</Text>
                                                    </AnimatedPressable>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Searched Item Helper Alert (expo-router deep-link) */}
                {(menuItemName || menuItemId) && (() => {
                    let searchedItem: MenuItem | null = null;
                    let searchedCategory: MenuCategory | null = null;

                    for (const category of restaurant.menuCategories || []) {
                        const item = category.items.find((i: MenuItem) =>
                            (menuItemId && i.id === menuItemId) ||
                            (menuItemName && String(i.name) === String(menuItemName))
                        );
                        if (item) {
                            searchedItem = item;
                            searchedCategory = category;
                            break;
                        }
                    }

                    if (searchedItem && searchedCategory) {
                        const customizable = isCustomizable(searchedItem);
                        const matchingCartItems = items.filter((i) => i.id === searchedItem!.id);
                        const cartItemTotalQty = matchingCartItems.reduce((sum, i) => sum + i.quantity, 0);
                        const hasInCart = matchingCartItems.length > 0;

                        return (
                            <View style={styles.searchedItemSection}>
                                <View style={styles.searchedItemHeader}>
                                    <Ionicons name="search" size={14} color={Colors.primary} />
                                    <Text style={styles.searchedItemLabel}>Searched Item Found</Text>
                                </View>
                                <View style={styles.searchedMenuItemCard}>
                                    <View style={styles.itemInfo}>
                                        <View style={styles.typeIconContainer}>
                                            <Ionicons
                                                name="caret-up-circle"
                                                size={16}
                                                color={searchedItem.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                            />
                                            {searchedItem.isBestseller && (
                                                <View style={styles.bestsellerBadge}>
                                                    <Ionicons name="star" size={10} color="#FFB800" />
                                                    <Text style={styles.bestsellerText}>Bestseller</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.itemName}>{searchedItem.name}</Text>
                                        <Text style={styles.itemPrice}>₹{getItemStartingPrice(searchedItem)}</Text>
                                        {customizable && (
                                            <Text style={styles.customizableText}>Customisable</Text>
                                        )}
                                        <Text style={styles.itemDesc} numberOfLines={3}>
                                            {searchedItem.description}
                                        </Text>
                                    </View>

                                    <View style={styles.imageActionContainer}>
                                        <Image
                                            source={{ uri: searchedItem.image ?? getPlaceholderImage(searchedItem.id) }}
                                            style={styles.itemImage}
                                            contentFit="cover"
                                        />
                                        <View style={styles.actionButtonWrapper}>
                                            {hasInCart ? (
                                                <View style={styles.quantityControls}>
                                                    <AnimatedPressable
                                                        onPress={() => {
                                                            const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                            updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity - 1);
                                                        }}
                                                        style={styles.qtyBtn}
                                                        scaleIn={0.8}
                                                    >
                                                        <Ionicons name="remove" size={18} color={Colors.primary} />
                                                    </AnimatedPressable>
                                                    <Text style={styles.qtyText}>{cartItemTotalQty}</Text>
                                                    <AnimatedPressable
                                                        onPress={() => {
                                                            if (customizable) {
                                                                handleAddPress(searchedItem!);
                                                            } else {
                                                                const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                                updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity + 1);
                                                            }
                                                        }}
                                                        style={styles.qtyBtn}
                                                        scaleIn={0.8}
                                                    >
                                                        <Ionicons name="add" size={18} color={Colors.primary} />
                                                    </AnimatedPressable>
                                                </View>
                                            ) : (
                                                <AnimatedPressable
                                                    style={styles.addButton}
                                                    onPress={() => handleAddPress(searchedItem!)}
                                                    scaleIn={0.9}
                                                >
                                                    <Text style={styles.addButtonText}>ADD</Text>
                                                </AnimatedPressable>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    }
                    return null;
                })()}

                {/* 5. Main Menu Category List with Accordions */}
                <View 
                    style={styles.menuContainer}
                    onLayout={(event) => {
                        menuContainerY.current = event.nativeEvent.layout.y;
                    }}
                >
                    {filteredCategories.length === 0 ? (
                        /* SEARCH EMPTY STATE */
                        <View style={styles.emptyStateCard}>
                            <Ionicons name="search" size={48} color={Colors.muted} style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyStateTitle}>No Matches Found</Text>
                            <Text style={styles.emptyStateSub}>
                                We couldn't find any dishes matching "{searchQuery}". Try searching for sweets, samosa or jalebi!
                            </Text>
                        </View>
                    ) : (
                        filteredCategories.map((category) => {
                            const isExpanded = !!expandedCategories[category.id];
                            let catEmoji = category.name.toLowerCase().includes("chaat") ? "🌶️" : "🍬";
                            
                            return (
                                <View
                                    key={category.id}
                                    style={styles.categorySection}
                                    onLayout={(event) => {
                                        categoryYRefs.current[category.id] = event.nativeEvent.layout.y;
                                    }}
                                >
                                    {/* Category Accordion Header */}
                                    <TouchableOpacity
                                        style={styles.categoryHeaderAccordion}
                                        onPress={() => toggleCategory(category.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View>
                                            <Text style={styles.categoryTitle}>
                                                {catEmoji} {category.name}
                                            </Text>
                                            <Text style={styles.categorySubtitle}>
                                                {category.items.length} {category.items.length === 1 ? "Item" : "Items"} available
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={22}
                                            color={Colors.secondary}
                                        />
                                    </TouchableOpacity>

                                    {/* Expanded Item list */}
                                    {isExpanded && (
                                        <Animated.View 
                                            entering={FadeInDown.duration(250)}
                                            exiting={FadeOutUp.duration(150)}
                                            layout={Layout.springify().damping(20).stiffness(150)}
                                            style={styles.itemsListContainer}
                                        >
                                            {category.items.map((item: MenuItem, index: number) => {
                                                const customizable = isCustomizable(item);
                                                const matchingCartItems = items.filter((i) => i.id === item.id);
                                                const cartItemTotalQty = matchingCartItems.reduce((sum, i) => sum + i.quantity, 0);
                                                const hasInCart = matchingCartItems.length > 0;

                                                return (
                                                    <Animated.View 
                                                        key={item.id} 
                                                        entering={FadeInDown.delay(index * 40).duration(300)}
                                                        style={styles.menuItemCard}
                                                    >
                                                        <View style={styles.itemInfo}>
                                                            <View style={styles.typeIconContainer}>
                                                                <Ionicons
                                                                    name="caret-up-circle"
                                                                    size={16}
                                                                    color={item.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                                                />
                                                                {item.isBestseller && (
                                                                    <View style={styles.bestsellerBadge}>
                                                                        <Ionicons name="star" size={10} color="#FFB800" />
                                                                        <Text style={styles.bestsellerText}>Bestseller</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text style={styles.itemName}>{item.name}</Text>
                                                            <Text style={styles.itemPrice}>₹{getItemStartingPrice(item)}</Text>
                                                            {customizable && (
                                                                <Text style={styles.customizableText}>Customisable</Text>
                                                            )}
                                                            <Text style={styles.itemDesc} numberOfLines={3}>
                                                                {item.description}
                                                            </Text>
                                                        </View>

                                                        <View style={styles.imageActionContainer}>
                                                            <Image
                                                                source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                                                                style={styles.itemImage}
                                                                contentFit="cover"
                                                            />
                                                            <View style={styles.actionButtonWrapper}>
                                                                {hasInCart ? (
                                                                    <View style={styles.quantityControls}>
                                                                        <AnimatedPressable
                                                                            onPress={() => {
                                                                                const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                                                updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity - 1);
                                                                            }}
                                                                            style={styles.qtyBtn}
                                                                            scaleIn={0.8}
                                                                        >
                                                                            <Ionicons name="remove" size={18} color={Colors.primary} />
                                                                        </AnimatedPressable>
                                                                        <Text style={styles.qtyText}>{cartItemTotalQty}</Text>
                                                                        <AnimatedPressable
                                                                            onPress={() => {
                                                                                if (customizable) {
                                                                                    handleAddPress(item);
                                                                                } else {
                                                                                    const lastItem = matchingCartItems[matchingCartItems.length - 1];
                                                                                    updateQuantity(lastItem.customUniqueId ?? lastItem.id, lastItem.quantity + 1);
                                                                                }
                                                                            }}
                                                                            style={styles.qtyBtn}
                                                                            scaleIn={0.8}
                                                                        >
                                                                            <Ionicons name="add" size={18} color={Colors.primary} />
                                                                        </AnimatedPressable>
                                                                    </View>
                                                                ) : (
                                                                    <AnimatedPressable
                                                                        style={styles.addButton}
                                                                        onPress={() => handleAddPress(item)}
                                                                        scaleIn={0.9}
                                                                    >
                                                                        <Text style={styles.addButtonText}>ADD</Text>
                                                                    </AnimatedPressable>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </Animated.View>
                                                );
                                            })}
                                        </Animated.View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

          
                {/* 7. Ratings and Review List Section */}
                <View style={styles.reviewsContainer}>
                    <Text style={styles.sectionHeading}>✍️ Customer Reviews</Text>

                    {/* Review List */}
                    {reviews.length === 0 ? (
                        <View style={styles.emptyReviewState}>
                            <Text style={styles.emptyReviewText}>No reviews yet. Be the first to share your experience!</Text>
                        </View>
                    ) : (
                        <View style={styles.reviewList}>
                            {reviews.map((rev: any, index: number) => (
                                <Animated.View 
                                    key={rev.id} 
                                    entering={FadeInDown.delay(index * 60).duration(450)}
                                    style={styles.reviewCard}
                                >
                                    <View style={styles.reviewerHeader}>
                                        <Image source={{ uri: rev.userAvatar }} style={styles.reviewerAvatar} />
                                        <View style={styles.reviewerMeta}>
                                            <Text style={styles.reviewerName}>
                                                {rev.userName} {rev.isVerified && "✅"}
                                            </Text>
                                            <View style={styles.reviewerSub}>
                                                <View style={styles.ratingBadgeMini}>
                                                    <Text style={styles.ratingBadgeMiniText}>{rev.rating} ⭐</Text>
                                                </View>
                                                <Text style={styles.reviewDate}>{rev.date}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                                </Animated.View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 8. Similar Restaurants Section */}
                {/* <View style={styles.similarSection}>
                    <Text style={styles.similarSectionTitle}>🍰 Similar Sweet & Chaat Outlets</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.similarSlider}
                    >
                        {similarRestaurants.map((sim) => (
                            <TouchableOpacity
                                key={sim.id}
                                style={styles.similarCard}
                                onPress={() => showToast(`Opening ${sim.name}...`, "success")}
                            >
                                <Image source={{ uri: sim.image }} style={styles.similarImage} contentFit="cover" />
                                <View style={styles.similarInfo}>
                                    <Text style={styles.similarName} numberOfLines={1}>{sim.name}</Text>
                                    <View style={styles.similarMetaRow}>
                                        <View style={styles.simRatingBadge}>
                                            <Ionicons name="star" size={10} color={Colors.white} />
                                            <Text style={styles.simRatingText}>{sim.rating}</Text>
                                        </View>
                                        <Text style={styles.simDistanceText}>• {sim.distance}</Text>
                                    </View>
                                    <Text style={styles.similarCuisines} numberOfLines={1}>
                                        {sim.cuisineTypes.join(", ")}
                                    </Text>
                                    <Text style={styles.similarPrice}>₹{sim.costForTwo} for two</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View> */}

                {/* FSSAI Registration Card */}
                {/* <View style={styles.fssaiContainer}>
                    <View style={styles.fssaiCard}>
                        <Image
                            source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/e/e4/FSSAI_logo.png" }}
                            style={styles.fssaiLogo}
                            contentFit="contain"
                        />
                        <View style={styles.fssaiTextContainer}>
                            <Text style={styles.fssaiLicense}>License No. 12523005000412</Text>
                            <Text style={styles.fssaiSub}>Shree Balaji Mithai & Chaat Bhandar</Text>
                        </View>
                    </View>
                    <Text style={styles.gstText}>GST Registered · FSSAI Approved Kitchen</Text>
                </View> */}

                {/* Cushion Height */}
                <View style={{ height: 160 }} />
            </Animated.ScrollView>

            {/* Sticky Floating Order Cart Banner */}
            {cartCount > 0 && (
                <View
                    style={[styles.cartBannerWrapper, { bottom: cartBannerBottom }]}
                    pointerEvents="box-none"
                >
                    <Animated.View
                        entering={SlideInDown.springify().damping(24).stiffness(90).mass(1)}
                        exiting={SlideOutDown.duration(250)}
                        style={{ width: '100%' }}
                        pointerEvents="box-none"
                    >
                        <AnimatedPressable
                            style={[styles.cartBanner, cartPulseStyle]}
                            onPress={() => router.push('/(tabs)/cart')}
                            scaleIn={0.98}
                        >
                            <View style={styles.cartContentLeft}>
                                <View style={styles.cartItemImagesContainer}>
                                    {items.slice(0, 3).map((item, index) => (
                                        <Image
                                            key={item.customUniqueId ?? item.id}
                                            source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                                            style={[styles.cartItemImage, { marginLeft: index * -12 }]}
                                            contentFit="cover"
                                        />
                                    ))}
                                </View>
                                <View style={styles.cartTextSection}>
                                    <Text style={styles.cartCountText}>{cartCount} ITEMS ADDED</Text>
                                    <Text style={styles.cartTotalText}>₹{cartTotal.toFixed(0)}<Text style={styles.cartTaxText}> + tax</Text></Text>
                                </View>
                            </View>
                            <View style={styles.cartActions}>
                                <AnimatedPressable
                                    style={styles.clearCartBtn}
                                    onPress={handleClearCart}
                                    scaleIn={0.8}
                                >
                                    <Ionicons name="trash-outline" size={18} color={Colors.white} />
                                </AnimatedPressable>
                                <View style={styles.viewCartAction}>
                                    <Text style={styles.viewCartText}>View Cart</Text>
                                    <Ionicons name="arrow-forward" size={16} color={Colors.white} />
                                </View>
                            </View>
                        </AnimatedPressable>
                    </Animated.View>
                </View>
            )}

            {/* Premium Sliding Customisation Bottom-Sheet Modal */}
            <Modal
                visible={selectedCustomizeItem !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedCustomizeItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <Ionicons
                                    name="caret-up-circle"
                                    size={18}
                                    color={selectedCustomizeItem?.type === 'VEG' ? '#27ae60' : '#e74c3c'}
                                />
                                <Text style={styles.modalItemName}>{selectedCustomizeItem?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedCustomizeItem(null)}>
                                <Ionicons name="close" size={26} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                        >
                            {selectedCustomizeItem?.description && (
                                <Text style={styles.modalItemDesc}>{selectedCustomizeItem.description}</Text>
                            )}

                            {/* Variants Section */}
                            {selectedCustomizeItem?.variants && selectedCustomizeItem.variants.length > 1 && (
                                <View style={styles.modalSection}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.modalSectionTitle}>Choose Size</Text>
                                        <Text style={styles.requiredBadge}>REQUIRED</Text>
                                    </View>
                                    <Text style={styles.modalSectionSub}>Select 1 option</Text>

                                    {selectedCustomizeItem.variants.map((v) => {
                                        const isSelected = selectedVariant?.id === v.id;
                                        return (
                                            <TouchableOpacity
                                                key={v.id}
                                                style={styles.modalOptionRow}
                                                onPress={() => setSelectedVariant(v)}
                                            >
                                                <View style={styles.modalOptionLeft}>
                                                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                                        {isSelected && <View style={styles.radioDot} />}
                                                    </View>
                                                    <Text style={styles.modalOptionName}>{v.name}</Text>
                                                </View>
                                                <Text style={styles.modalOptionPrice}>₹{v.price}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Addon Groups Section */}
                            {selectedCustomizeItem?.addons?.map((group) => (
                                <View key={group.id} style={styles.modalSection}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.modalSectionTitle}>{group.name}</Text>
                                        {group.minSelect >= 1 && (
                                            <Text style={styles.requiredBadge}>REQUIRED</Text>
                                        )}
                                    </View>
                                    <Text style={styles.modalSectionSub}>
                                        {group.minSelect >= 1
                                            ? `Select exactly ${group.minSelect} option`
                                            : `Optional · Select up to ${group.maxSelect} options`}
                                    </Text>

                                    {group.options.map((option) => {
                                        const isSelected = selectedAddons.some(o => o.id === option.id);
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                style={styles.modalOptionRow}
                                                onPress={() => handleToggleAddon(group, option)}
                                            >
                                                <View style={styles.modalOptionLeft}>
                                                    {group.maxSelect === 1 ? (
                                                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                                            {isSelected && <View style={styles.radioDot} />}
                                                        </View>
                                                    ) : (
                                                        <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
                                                            {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                                                        </View>
                                                    )}
                                                    <Text style={styles.modalOptionName}>{option.name}</Text>
                                                </View>
                                                {option.price > 0 && (
                                                    <Text style={styles.modalOptionPrice}>+₹{option.price}</Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {/* Sticky Footer */}
                        <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
                            <View style={styles.modalQtyContainer}>
                                <TouchableOpacity
                                    onPress={() => setCustomizeQty(prev => Math.max(1, prev - 1))}
                                    style={styles.modalQtyBtn}
                                >
                                    <Ionicons name="remove" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.modalQtyText}>{customizeQty}</Text>
                                <TouchableOpacity
                                    onPress={() => setCustomizeQty(prev => prev + 1)}
                                    style={styles.modalQtyBtn}
                                >
                                    <Ionicons name="add" size={20} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.modalAddCartBtn}
                                onPress={() => {
                                    if (selectedCustomizeItem) {
                                        addItem(
                                            selectedCustomizeItem,
                                            restaurant.id,
                                            selectedVariant || undefined,
                                            selectedAddons,
                                            customizeQty
                                        );
                                        showToast(`${selectedCustomizeItem.name} customized and added`, 'success');
                                        setSelectedCustomizeItem(null);
                                    }
                                }}
                            >
                                <Text style={styles.modalAddCartBtnText}>
                                    Add Item · ₹{(
                                        ((selectedVariant?.price ?? getItemStartingPrice(selectedCustomizeItem!)) +
                                            selectedAddons.reduce((sum, a) => sum + a.price, 0)) *
                                        customizeQty
                                    ).toFixed(0)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Swiggy/Zomato-inspired Floating Menu FAB */}
            {restaurant?.menuCategories && restaurant.menuCategories.length > 0 && (
                <Animated.View
                    style={[
                        styles.floatingMenuFabContainer,
                        menuFabAnimatedStyle,
                        {
                            bottom: cartCount > 0
                                ? cartBannerBottom + 70 + 10
                                : 24 + insets.bottom,
                        },
                    ]}
                >
                    <AnimatedPressable
                        style={styles.floatingMenuFab}
                        onPress={() => setMenuModalVisible(true)}
                        scaleIn={0.9}
                    >
                        <Ionicons name="restaurant" size={16} color={Colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.floatingMenuText}>MENU</Text>
                    </AnimatedPressable>
                </Animated.View>
            )}

            {/* Menu Categories Modal Popup */}
            {restaurant?.menuCategories && (
                <Modal
                    visible={menuModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setMenuModalVisible(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setMenuModalVisible(false)}
                    >
                        <View style={[styles.menuCategoriesBox, { bottom: 85 + insets.bottom }]}>
                            <Text style={styles.menuBoxHeader}>Menu Categories</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {restaurant.menuCategories.map((cat) => {
                                    const isActive = activeTabId === cat.id;
                                    const itemCount = cat.items?.length || 0;
                                    let emoji = cat.name.toLowerCase().includes("chaat") ? "🌶️" : "🍬";
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.menuBoxItem,
                                                isActive && styles.menuBoxItemActive
                                            ]}
                                            onPress={() => {
                                                setMenuModalVisible(false);
                                                setTimeout(() => {
                                                    scrollToCategory(cat.id);
                                                }, 100);
                                            }}
                                        >
                                            <View style={styles.menuBoxItemLeft}>
                                                <Text style={styles.menuBoxEmoji}>{emoji}</Text>
                                                <Text style={[
                                                    styles.menuBoxItemText,
                                                    isActive && styles.menuBoxItemTextActive
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </View>
                                            <Text style={[
                                                styles.menuBoxCountText,
                                                isActive && styles.menuBoxCountTextActive
                                            ]}>
                                                {itemCount}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: Colors.background,
    },
    errorText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        paddingHorizontal: 30,
        paddingVertical: 14,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    retryText: {
        fontFamily: Fonts.brandBold,
        color: Colors.white,
        fontSize: FontSize.sm,
    },
    headerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerBg: {
        ...StyleSheet.absoluteFillObject,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 56,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: isDark ? "rgba(27, 38, 59, 0.7)" : "rgba(255, 255, 255, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerNameContainer: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: "center",
    },
    headerRestaurantName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.secondary,
        textAlign: "center",
    },
    headerRightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: isDark ? "rgba(27, 38, 59, 0.7)" : "rgba(255, 255, 255, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageHeader: {
        height: 230,
        position: "relative",
        overflow: "hidden",
    },
    bannerImage: {
        width: "100%",
        height: "100%",
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.25)",
    },
    detailsCardWrapper: {
        marginTop: -30,
        paddingHorizontal: 16,
        zIndex: 5,
    },
    closedBanner: {
        backgroundColor: "#d32f2f",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        justifyContent: "center",
    },
    closedText: {
        fontFamily: Fonts.brandBold,
        color: Colors.white,
        fontSize: FontSize.xs,
    },
    restaurantMainCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    nameHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 8,
    },
    restaurantTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
        color: Colors.secondary,
        flex: 1,
        lineHeight: 28,
    },
    verifiedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.primary}15`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    verifiedText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.primary,
    },
    descriptionText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },
    cuisinesContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
        paddingBottom: 2,
    },
    cuisineChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? "#2A3C54" : "#F4F6F9",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 5,
    },
    cuisineEmoji: {
        fontSize: 13,
    },
    cuisineLabel: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    locationTimingStrip: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 14,
        gap: 12,
    },
    stripItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    stripText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    stripDivider: {
        width: 1,
        height: 14,
        backgroundColor: Colors.border,
    },
    badgesScrollRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
        paddingBottom: 4,
    },
    badgeChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? "rgba(212, 175, 55, 0.08)" : "rgba(212, 175, 55, 0.05)",
        borderWidth: 1,
        borderColor: `${Colors.primary}30`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    badgeEmoji: {
        fontSize: 12,
    },
    badgeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.primary,
    },
    aiRecommendationCard: {
        backgroundColor: isDark ? "#172A45" : "#FFFBF0",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? "#2c3e50" : "#FFF3D6",
        padding: 16,
        marginTop: 14,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.05 : 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    aiCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    aiHeaderTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: 13,
        color: Colors.primary,
    },
    aiCardBody: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.text,
        lineHeight: 18,
        fontStyle: "italic",
    },
    statsStripGrid: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.05 : 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statValue: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.md,
        color: Colors.secondary,
        marginTop: 6,
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
        textAlign: "center",
    },
    stickyBarContainer: {
        backgroundColor: Colors.background,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        zIndex: 50,
    },
    absoluteStickyBar: {
        position: "absolute",
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        zIndex: 99,
        // subtle shadow when sticky
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    searchBarWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 16,
        marginHorizontal: 16,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
    },
    searchIcon: {
        marginRight: 2,
    },
    searchInput: {
        flex: 1,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.secondary,
    },
    filterChipsRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        marginTop: 12,
        paddingBottom: 2,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    filterChipActive: {
        backgroundColor: Colors.secondary,
        borderColor: Colors.secondary,
    },
    filterChipText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.primary,
    },
    sortDropdownContainer: {
        position: "absolute",
        top: 50,
        left: 100,
        backgroundColor: isDark ? "#1B263B" : Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 6,
        width: 180,
        zIndex: 999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    sortDropdownOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    sortDropdownOptionActive: {
        backgroundColor: Colors.primary + "15",
    },
    sortDropdownText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: isDark ? Colors.white : Colors.secondary,
    },
    sortDropdownTextActive: {
        color: Colors.primary,
        fontFamily: Fonts.brandBold,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    categoriesTabRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        marginTop: 12,
        paddingBottom: 2,
    },
    categoryTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: isDark ? "#1b263b" : "#F4F6F9",
    },
    categoryTabActive: {
        backgroundColor: Colors.primary + '25',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    categoryTabText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    categoryTabTextActive: {
        color: Colors.primary,
    },
    featuredSection: {
        marginTop: 20,
        paddingLeft: 16,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.md,
        color: Colors.secondary,
    },
    sectionSubtitle: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    featuredSliderContainer: {
        flexDirection: "row",
        gap: 12,
        paddingRight: 16,
        paddingBottom: 4,
    },
    featuredItemCard: {
        width: 145,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.1 : 0.03,
        shadowRadius: 8,
        elevation: 3,
    },
    featuredItemImage: {
        width: "100%",
        height: 100,
    },
    featuredItemInfo: {
        padding: 10,
    },
    vegIndicatorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 4,
    },
    featuredTagText: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.primary,
        letterSpacing: 0.3,
    },
    featuredItemName: {
        fontFamily: Fonts.brandBold,
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 4,
    },
    featuredItemPrice: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xs,
        color: Colors.primary,
        marginBottom: 10,
    },
    featuredActionBtnWrapper: {
        alignItems: "center",
        marginTop: 4,
    },
    menuContainer: {
        paddingHorizontal: 16,
    },
    categorySection: {
        marginTop: 20,
    },
    categoryHeaderAccordion: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.05 : 0.01,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.md,
        color: Colors.secondary,
    },
    categorySubtitle: {
        fontFamily: Fonts.brandMedium,
        fontSize: 11,
        color: Colors.muted,
        marginTop: 2,
    },
    itemsListContainer: {
        marginTop: 10,
        gap: 12,
    },
    menuItemCard: {
        flexDirection: "row",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        gap: 12,
        alignItems: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.05 : 0.02,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.secondary,
        marginBottom: 4,
        lineHeight: 22,
    },
    itemPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: 15,
        color: Colors.primary,
        marginBottom: 4,
    },
    customizableText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
        color: Colors.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    itemDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    typeIconContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 8,
    },
    bestsellerBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? "rgba(255, 184, 0, 0.12)" : "#FFF9E6",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4,
    },
    bestsellerText: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: "#B88E00",
    },
    imageActionContainer: {
        position: 'relative',
        width: 110,
        height: 110,
        marginLeft: 12,
    },
    itemImage: {
        width: 110,
        height: 110,
        borderRadius: 14,
    },
    actionButtonWrapper: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    addButton: {
        backgroundColor: Colors.secondary,
        borderRadius: 10,
        width: 90,
        height: 34,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
        alignSelf: 'center',
    },
    addButtonText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 13,
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        borderRadius: 10,
        width: 90,
        height: 34,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        paddingHorizontal: 2,
        alignSelf: 'center',
    },
    qtyBtn: {
        width: 28,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 6,
    },
    qtyText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 13,
        color: Colors.primary,
        textAlign: "center",
    },
    emptyStateCard: {
        paddingVertical: 32,
        paddingHorizontal: 20,
        backgroundColor: Colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
    },
    emptyStateTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.secondary,
        marginBottom: 8,
    },
    emptyStateSub: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: "center",
        lineHeight: 18,
    },
    searchedItemSection: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
    searchedItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    searchedItemLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    searchedMenuItemCard: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        gap: 12,
        alignItems: "flex-start",
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    mapSectionContainer: {
        marginHorizontal: 16,
        marginTop: 24,
        padding: 20,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.08 : 0.02,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeading: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.secondary,
        marginBottom: 4,
    },
    locationSubText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginBottom: 16,
    },
    mapFrame: {
        height: 170,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    webMapContainer: {
        height: 170,
        borderRadius: 16,
        backgroundColor: isDark ? "#1b263b" : "#F4F6F9",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderStyle: "dashed",
    },
    webMapText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.secondary,
        marginTop: 8,
        marginBottom: 4,
    },
    webMapCoords: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
    },
    customMarker: {
        alignItems: "center",
        justifyContent: "center",
    },
    markerCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: Colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderLeftColor: "transparent",
        borderRightWidth: 6,
        borderRightColor: "transparent",
        borderTopWidth: 6,
        borderTopColor: Colors.primary,
        marginTop: -1,
    },
    mapActionsRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    mapCTAButton: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    mapCTAText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
    },
    reviewsContainer: {
        marginHorizontal: 16,
        marginTop: 24,
    },
    writeReviewCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 16,
        marginTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.05 : 0.01,
        shadowRadius: 8,
        elevation: 2,
    },
    writeReviewTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.secondary,
        marginBottom: 8,
    },
    verificationBadge: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
        marginBottom: 14,
    },
    verificationBadgeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
        flex: 1,
        lineHeight: 14,
    },
    starRow: {
        flexDirection: "row",
        marginBottom: 14,
    },
    reviewInput: {
        backgroundColor: isDark ? "#1b263b" : "#F4F6F9",
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.secondary,
        minHeight: 70,
        textAlignVertical: "top",
        marginBottom: 12,
    },
    reviewPhotosPreviewScroll: {
        flexDirection: "row",
        marginBottom: 12,
    },
    reviewPhotoPreviewWrapper: {
        position: "relative",
        marginRight: 10,
    },
    reviewPhotoPreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    removePhotoBtn: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: Colors.white,
        borderRadius: 10,
    },
    reviewSubmitRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    attachPhotoBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: isDark ? "#2A3C54" : "#F0F3F6",
    },
    attachPhotoText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.text,
    },
    submitReviewBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    submitReviewText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.xs,
        color: Colors.white,
    },
    emptyReviewState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    emptyReviewText: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: "center",
    },
    reviewList: {
        marginTop: 14,
        gap: 12,
    },
    reviewCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 14,
    },
    reviewerHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },
    reviewerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    reviewerMeta: {
        flex: 1,
    },
    reviewerName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.secondary,
    },
    reviewerSub: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 2,
    },
    ratingBadgeMini: {
        backgroundColor: "#FFB800",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    ratingBadgeMiniText: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.white,
    },
    reviewDate: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.muted,
    },
    reviewComment: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.text,
        lineHeight: 18,
    },
    reviewPhotosRow: {
        flexDirection: "row",
        marginTop: 10,
        gap: 8,
    },
    reviewAttachedImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
    },
    similarSection: {
        marginTop: 24,
        paddingLeft: 16,
    },
    similarSectionTitle: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.lg,
        color: Colors.secondary,
        marginBottom: 12,
    },
    similarSlider: {
        flexDirection: "row",
        gap: 12,
        paddingRight: 16,
        paddingBottom: 4,
    },
    similarCard: {
        width: 160,
        backgroundColor: Colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.08 : 0.02,
        shadowRadius: 6,
        elevation: 2,
    },
    similarImage: {
        width: "100%",
        height: 100,
    },
    similarInfo: {
        padding: 10,
    },
    similarName: {
        fontFamily: Fonts.brandBold,
        fontSize: 13,
        color: Colors.secondary,
        marginBottom: 4,
    },
    similarMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    simRatingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    simRatingText: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.white,
    },
    simDistanceText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 10,
        color: Colors.muted,
    },
    similarCuisines: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    similarPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.primary,
    },
    fssaiContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 28,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    fssaiCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 12,
        maxWidth: "90%",
    },
    fssaiLogo: {
        width: 50,
        height: 25,
    },
    fssaiTextContainer: {
        flex: 1,
    },
    fssaiLicense: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.secondary,
    },
    fssaiSub: {
        fontFamily: Fonts.brand,
        fontSize: 9,
        color: Colors.muted,
        marginTop: 1,
    },
    gstText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 9,
        color: Colors.muted,
        marginTop: 8,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    cartBannerWrapper: {
        position: "absolute",
        left: 16,
        right: 16,
        zIndex: 99,
    },
    cartBanner: {
        backgroundColor: isDark ? Colors.surface : Colors.secondary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 18,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    cartContentLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
        marginRight: 10,
    },
    cartItemImagesContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: 80,
        height: 40,
    },
    cartItemImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    cartTextSection: {
        flex: 1,
        marginLeft: 8,
    },
    cartCountText: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        color: Colors.primary,
        letterSpacing: 0.3,
    },
    cartTotalText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 15,
        color: Colors.primary,
        marginTop: 1,
    },
    cartTaxText: {
        fontFamily: Fonts.brand,
        fontSize: 10,
        opacity: 0.8,
    },
    cartActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    clearCartBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    viewCartAction: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    viewCartText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85%",
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    modalItemName: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.lg,
        color: Colors.secondary,
        flex: 1,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    modalItemDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        lineHeight: 18,
        marginBottom: 20,
    },
    modalSection: {
        marginBottom: 24,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    modalSectionTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.secondary,
    },
    requiredBadge: {
        fontFamily: Fonts.brandBold,
        fontSize: 9,
        color: Colors.white,
        backgroundColor: Colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    modalSectionSub: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: 12,
    },
    modalOptionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalOptionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    radioCircleSelected: {
        borderColor: Colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxBoxSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    modalOptionName: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.text,
    },
    modalOptionPrice: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    modalFooter: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
        gap: 16,
    },
    modalQtyContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.primary}12`,
        borderRadius: 14,
        padding: 4,
        gap: 12,
    },
    modalQtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    modalQtyText: {
        fontFamily: Fonts.brandBlack,
        fontSize: 16,
        color: Colors.secondary,
        minWidth: 24,
        textAlign: "center",
    },
    modalAddCartBtn: {
        flex: 1,
        backgroundColor: Colors.secondary,
        height: 50,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    modalAddCartBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
    },
    floatingMenuFabContainer: {
        position: "absolute",
        right: 16,
        zIndex: 9999,
    },
    floatingMenuFab: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0F172A",
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    floatingMenuText: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.white,
        letterSpacing: 1.2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "flex-end",
        alignItems: "flex-end",
    },
    menuCategoriesBox: {
        width: 260,
        maxHeight: 340,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        marginRight: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    menuBoxHeader: {
        fontFamily: Fonts.brandBold,
        fontSize: 11,
        textTransform: "uppercase",
        color: Colors.muted,
        letterSpacing: 1.2,
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    menuBoxItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginVertical: 2,
    },
    menuBoxItemActive: {
        backgroundColor: Colors.primary + "15",
    },
    menuBoxItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    menuBoxEmoji: {
        fontSize: 16,
    },
    menuBoxItemText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 14,
        color: Colors.text,
    },
    menuBoxItemTextActive: {
        fontFamily: Fonts.brandBold,
        color: Colors.primary,
    },
    menuBoxCountText: {
        fontFamily: Fonts.brandMedium,
        fontSize: 12,
        color: Colors.muted,
    },
    menuBoxCountTextActive: {
        fontFamily: Fonts.brandBold,
        color: Colors.primary,
    },
});
