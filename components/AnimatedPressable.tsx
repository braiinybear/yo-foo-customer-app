import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '../hooks/useAnimatedPress';
import { ANIMATION } from '../animations/constants';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  scaleIn?: number;
  springConfig?: any;
}

/**
 * AnimatedPressable
 * A drop-in replacement for TouchableOpacity/Pressable that adds
 * premium spring-based scale feedback and haptics.
 */
export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  containerStyle,
  scaleIn = ANIMATION.scale.pressIn,
  springConfig = ANIMATION.spring.snappy,
  ...props
}) => {
  const { animatedStyle, pressHandlers } = useAnimatedPress(scaleIn, springConfig);

  return (
    <AnimatedPressableBase
      {...props}
      {...pressHandlers}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
};
