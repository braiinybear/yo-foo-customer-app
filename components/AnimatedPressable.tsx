import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, StyleSheet } from 'react-native';
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
  entering?: any;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  containerStyle,
  scaleIn = ANIMATION.scale.pressIn,
  springConfig = ANIMATION.spring.snappy,
  entering,
  ...props
}) => {
  const { animatedStyle, pressHandlers } = useAnimatedPress(scaleIn, springConfig);

  // If there's an entering layout animation, wrap in Animated.View to avoid transform conflict warning
  if (entering) {
    const flattenedStyle = StyleSheet.flatten(style) || {};
    
    // Split layout/positioning styles to apply to the parent wrapper View
    // so layout animations position correctly without clipping shadows
    const {
      margin,
      marginHorizontal,
      marginVertical,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      position,
      top,
      bottom,
      left,
      right,
      flex,
      alignSelf,
      width,
      height,
      ...pressableStyle
    } = flattenedStyle as any;

    const wrapperStyle = {
      margin,
      marginHorizontal,
      marginVertical,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      position,
      top,
      bottom,
      left,
      right,
      flex,
      alignSelf,
      width,
      height,
    };

    return (
      <Animated.View 
        entering={entering} 
        style={[wrapperStyle, containerStyle]}
        needsOffscreenAlphaCompositing={true}
      >
        <AnimatedPressableBase
          {...props}
          {...pressHandlers}
          style={[pressableStyle, animatedStyle]}
        >
          {children}
        </AnimatedPressableBase>
      </Animated.View>
    );
  }

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
