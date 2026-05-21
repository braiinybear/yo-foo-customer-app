import { Image } from "expo-image";
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useCartStore } from '@/store/useCartStore';
import { getPlaceholderImage } from '@/constants/images';
import { showAlert } from '@/store/useAlertStore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GlobalCartBanner() {
  const { Colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  // Individual selectors — only re-render when these primitives actually change
  const items = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount);
  const cartCount = items.length;
  const displayItems = useMemo(() => items.slice(0, 3), [items]);

  const handleClearCart = useCallback(() => {
    showAlert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            useCartStore.setState({ items: [], totalAmount: 0, restaurantId: null });
          },
          style: 'destructive',
        },
      ]
    );
  }, []);

  const styles = useMemo(() => {
    const bottomPadding = Math.max(insets.bottom, 10);
    const cartBannerBottom = 58 + bottomPadding + 8; // Sits perfectly above the bottom tab bar
    return createStyles(Colors, isDark, cartBannerBottom);
  }, [Colors, isDark, insets.bottom]);

  // Hide the banner if the cart is empty or the user is already on the Cart screen
  if (cartCount === 0 || pathname.includes('cart')) {
    return null;
  }

  return (
    <View style={styles.cartBannerWrapper} pointerEvents="box-none">
      <Animated.View
        entering={SlideInDown.springify().damping(26).stiffness(80).mass(1)}
        exiting={SlideOutDown.duration(300)}
        style={{ width: '100%' }}
        pointerEvents="box-none"
      >
        <AnimatedPressable
          style={styles.cartBanner}
          onPress={() => router.push('/(tabs)/cart')}
          scaleIn={0.98}
        >
        <View style={styles.cartContentLeft}>
          <View style={styles.cartItemImagesContainer}>
            {displayItems.map((item, index) => (
              <Image
                key={item.id}
                source={{ uri: item.image ?? getPlaceholderImage(item.id) }}
                style={[styles.cartItemImage, { marginLeft: index * -10 }]}
                contentFit="cover"
              />
            ))}
          </View>
          <View style={styles.cartTextSection}>
            <Text style={styles.cartCountText}>{cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}</Text>
            <Text style={styles.cartTotalText}>
              ₹{totalAmount.toFixed(2)}
              <Text style={styles.cartTaxText}> + tax</Text>
            </Text>
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
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean, cartBannerBottom: number) =>
  StyleSheet.create({
    cartBannerWrapper: {
      position: 'absolute',
      bottom: cartBannerBottom,
      left: 16,
      right: 16,
      zIndex: 99,
    },
    cartBanner: {
      backgroundColor: isDark ? Colors.surface : Colors.secondary, // Midnight Navy
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: isDark ? Colors.primary : Colors.secondary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.15 : 0.25,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1,
      borderColor: Colors.primary + '30', // Subtle gold border
    },
    cartContentLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    cartItemImagesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 14,
    },
    cartItemImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: Colors.surface,
      backgroundColor: Colors.surface,
    },
    cartTextSection: {
      flex: 1,
      justifyContent: 'center',
    },
    cartCountText: {
      fontFamily: Fonts.brandBold,
      fontSize: 10,
      color: Colors.primary, // Gold
      letterSpacing: 0.5,
    },
    cartTotalText: {
      fontFamily: Fonts.brandBlack,
      fontSize: FontSize.md,
      color: Colors.white,
      marginTop: 2,
    },
    cartTaxText: {
      fontFamily: Fonts.brand,
      fontSize: 9,
      color: 'rgba(255, 255, 255, 0.6)',
    },
    cartActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    clearCartBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(239, 68, 68, 0.2)', // Light red transparent
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    viewCartAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.primary, // Gold
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
