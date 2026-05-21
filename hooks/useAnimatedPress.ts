import { useSharedValue, useAnimatedStyle, withSpring, runOnUI } from 'react-native-reanimated';
import { ANIMATION } from '../animations/constants';
import { useMemo } from 'react';

/**
 * useAnimatedPress
 * Hook to provide physics-based scale feedback for any touchable element.
 * All animations run on the UI thread for 60fps performance.
 */
export function useAnimatedPress(
  scaleIn: number = ANIMATION.scale.pressIn,
  springConfig: any = ANIMATION.spring.snappy
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Stable press handlers — animations dispatched to UI thread for zero-bridge-latency
  const pressHandlers = useMemo(() => ({
    onPressIn: () => {
      'worklet';
      scale.value = withSpring(scaleIn, springConfig);
    },
    onPressOut: () => {
      'worklet';
      scale.value = withSpring(1, springConfig);
    },
  }), [scaleIn, springConfig]);

  return {
    animatedStyle,
    pressHandlers,
  };
}

