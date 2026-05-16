import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useToastStore } from '@/store/useToastStore';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AnimatedToast = () => {
  const { visible, message, type } = useToastStore();
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(
        type === 'success' 
          ? Haptics.NotificationFeedbackType.Success 
          : type === 'error' 
            ? Haptics.NotificationFeedbackType.Error 
            : Haptics.NotificationFeedbackType.Warning
      );
      translateY.value = withSpring(0, { damping: 20, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 400 });
    } else {
      translateY.value = withSpring(100, { damping: 20, stiffness: 100 });
      opacity.value = withTiming(0, { duration: 400 });
    }
  }, [visible, type]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return Colors.success;
      case 'error': return Colors.danger;
      default: return Colors.primary;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { bottom: insets.bottom + 100 },
        animatedStyle
      ]}
    >
      <View style={[styles.toast, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Ionicons name={getIcon()} size={20} color={getColor()} />
        <Text style={[styles.text, { color: Colors.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: '90%',
  },
  text: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
});
