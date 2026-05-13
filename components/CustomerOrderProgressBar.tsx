import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize } from '@/constants/typography';

interface CustomerOrderProgressBarProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

const CUSTOMER_ORDER_STATUSES = [
  { key: 'PLACED', label: 'Placed', icon: 'receipt-outline' as const, color: '#1565C0', message: 'Your order has been placed' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle' as const, color: '#6A1B9A', message: 'Restaurant confirmed your order' },
  { key: 'PREPARING', label: 'Preparing', icon: 'restaurant' as const, color: '#E65100', message: 'Your food is being prepared' },
  { key: 'READY', label: 'Ready', icon: 'cube' as const, color: '#F57C00', message: 'Order is ready for pickup' },
  { key: 'ON_THE_WAY', label: 'On the Way', icon: 'bicycle' as const, color: '#00838F', message: 'Your rider is on the way' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-circle' as const, color: '#2E7D32', message: 'Enjoy your meal! 🎉' },
];

/**
 * CustomerOrderProgressBar: Zomato/Swiggy-style visual progress indicator
 * - Animated pulsing for the current active step
 * - Step-connected line indicator
 * - Color-coded stages
 * - Descriptive status message
 */
export function CustomerOrderProgressBar({ status, size = 'medium' }: CustomerOrderProgressBarProps) {
  const { Colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const [progressAnim] = useState(new Animated.Value(0));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentStageIndex = useMemo(() => {
    return CUSTOMER_ORDER_STATUSES.findIndex(s => s.key === status);
  }, [status]);

  const progress = useMemo(() => {
    if (currentStageIndex === -1) return 0;
    return (currentStageIndex) / (CUSTOMER_ORDER_STATUSES.length - 1);
  }, [currentStageIndex]);

  // Animate progress bar fill
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Pulse animation for current step
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const sizeConfig = {
    small: { iconSize: 14, labelSize: 9, lineH: 3, circleSize: 24 },
    medium: { iconSize: 16, labelSize: 10, lineH: 3, circleSize: 30 },
    large: { iconSize: 20, labelSize: 12, lineH: 4, circleSize: 36 },
  };

  const config = sizeConfig[size];
  const currentStage = CUSTOMER_ORDER_STATUSES[currentStageIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Status message */}
      {currentStage && (
        <View style={[styles.messageBanner, { backgroundColor: currentStage.color + '12' }]}>
          <View style={[styles.messageDot, { backgroundColor: currentStage.color }]} />
          <Text style={[styles.messageText, { color: currentStage.color }]}>
            {currentStage.message}
          </Text>
        </View>
      )}

      {/* Progress line + Circles */}
      <View style={styles.progressRow}>
        {/* Background line */}
        <View style={[styles.progressLine, { height: config.lineH }]}>
          <Animated.View
            style={[
              styles.progressLineFill,
              {
                width: progressWidth,
                backgroundColor: currentStage?.color ?? Colors.muted,
                height: '100%',
              },
            ]}
          />
        </View>

        {/* Step circles overlaid on line */}
        {CUSTOMER_ORDER_STATUSES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isFuture = index > currentStageIndex;
          const stageColor = isCompleted ? '#2E7D32' : isCurrent ? stage.color : '#E0E0E0';
          const iconColor = (isCompleted || isCurrent) ? '#FFF' : '#BDBDBD';

          const circleContent = (
            <View
              style={[
                styles.stepCircle,
                {
                  width: config.circleSize,
                  height: config.circleSize,
                  borderRadius: config.circleSize / 2,
                  backgroundColor: stageColor,
                  borderWidth: isCurrent ? 2.5 : 0,
                  borderColor: isCurrent ? stageColor + '44' : 'transparent',
                },
              ]}
            >
              <Ionicons name={stage.icon} size={config.iconSize} color={iconColor} />
            </View>
          );

          return (
            <View key={stage.key} style={styles.stepWrapper}>
              {isCurrent ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  {circleContent}
                </Animated.View>
              ) : (
                circleContent
              )}
              {size !== 'small' && (
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      fontSize: config.labelSize,
                      color: isCurrent ? stage.color : isCompleted ? '#2E7D32' : Colors.muted,
                      fontFamily: isCurrent ? Fonts.brandBold : Fonts.brand,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {stage.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    gap: 14,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  messageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messageText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    flex: 1,
  },
  progressRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  progressLine: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressLineFill: {
    borderRadius: 4,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 52,
    gap: 6,
  },
  stepCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepLabel: {
    textAlign: 'center',
  },
});
