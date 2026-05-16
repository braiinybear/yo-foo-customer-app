import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Pressable,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useTheme } from '@/context/ThemeContext';
import { ANIMATION } from '@/animations/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
}

/**
 * AnimatedBottomSheet
 * A premium, gesture-driven bottom sheet with modern Gesture API and spring physics.
 */
export const AnimatedBottomSheet: React.FC<AnimatedBottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = SCREEN_HEIGHT * 0.7,
}) => {
  const { Colors } = useTheme();
  const translateY = useSharedValue(0);
  const contextY = useSharedValue(0);

  const scrollTo = (destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, ANIMATION.spring.heavy);
  };

  useEffect(() => {
    if (visible) {
      scrollTo(-height);
    } else {
      scrollTo(0);
    }
  }, [visible, height]);

  // Handle hardware back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible, onClose]);

  const gesture = Gesture.Pan()
    .activeOffsetY([-10, 10]) // Prevent hijacking small scrolls
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(contextY.value + event.translationY, -SCREEN_HEIGHT);
    })
    .onEnd((event) => {
      if (translateY.value > -height / 1.5 || event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        scrollTo(-height);
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [-height + 50, -height],
      [25, height >= SCREEN_HEIGHT ? 0 : 32],
      Extrapolate.CLAMP
    );

    return {
      borderRadius,
      transform: [{ translateY: translateY.value }],
    };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateY.value,
        [-height, 0],
        [1, 0],
        Extrapolate.CLAMP
      ),
      display: translateY.value === 0 ? 'none' : 'flex',
    };
  });

  return (
    <>
      <Animated.View style={[styles.backdrop, rBackdropStyle]}>
        <Pressable style={styles.flex} onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            { height: SCREEN_HEIGHT, top: SCREEN_HEIGHT, backgroundColor: Colors.surface },
            rBottomSheetStyle,
          ]}
        >
          <View style={styles.line} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  bottomSheetContainer: {
    width: '100%',
    position: 'absolute',
    zIndex: 1000,
  },
  line: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginVertical: 15,
    borderRadius: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
  },
});
