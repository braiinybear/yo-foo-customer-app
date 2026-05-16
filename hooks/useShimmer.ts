import { useEffect } from 'react';
import { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  useAnimatedStyle,
  interpolate
} from 'react-native-reanimated';

/**
 * useShimmer
 * Hook to provide a repeating shimmer animation value.
 * Returns an animated style that can be applied to a "shimmer" overlay.
 */
export function useShimmer(duration = 1200) {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Do not reverse
    );
  }, [duration, shimmerValue]);

  // Animated style for a simple opacity pulse (Fallback if no LinearGradient is used)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shimmerValue.value,
      [0, 0.5, 1],
      [0.3, 0.7, 0.3]
    ),
  }));

  return {
    shimmerValue,
    pulseStyle,
  };
}
