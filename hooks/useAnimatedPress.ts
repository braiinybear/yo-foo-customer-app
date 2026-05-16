import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ANIMATION } from '../animations/constants';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/**
 * useAnimatedPress
 * Hook to provide physics-based scale feedback for any touchable element.
 * Includes optional haptic feedback for a premium feel.
 */
export function useAnimatedPress(
  scaleIn: number = ANIMATION.scale.pressIn,
  springConfig: any = ANIMATION.spring.snappy
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    // Trigger subtle haptic on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(scaleIn, springConfig);
  }, [scaleIn, springConfig]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [springConfig]);

  return {
    animatedStyle,
    pressHandlers: {
      onPressIn,
      onPressOut,
    },
  };
}
