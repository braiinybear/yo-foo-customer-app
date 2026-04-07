import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface CustomerOrderProgressBarProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

const CUSTOMER_ORDER_STATUSES = [
  { key: 'PLACED', label: 'Placed', icon: 'checkmark-circle' as const, color: '#2196F3' },
  { key: 'ACCEPTED', label: 'Accepted', icon: 'checkmark-circle' as const, color: '#2196F3' },
  { key: 'PREPARING', label: 'Preparing', icon: 'restaurant' as const, color: '#FF9800' },
  { key: 'READY', label: 'Ready', icon: 'cube' as const, color: '#FF9800' },
  { key: 'ON_THE_WAY', label: 'On The Way', icon: 'bicycle' as const, color: '#4CAF50' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-circle' as const, color: '#4CAF50' },
];

/**
 * CustomerOrderProgressBar: Visual progress indicator for customer
 * - Simpler than restaurant version (customer doesn't see PICKED_UP)
 * - Color-coded by category
 * - Smooth animations
 * - Current stage highlighted
 */
export function CustomerOrderProgressBar({ status, size = 'medium' }: CustomerOrderProgressBarProps) {
  const [progressAnim] = useState(new Animated.Value(0));

  const currentStageIndex = useMemo(() => {
    return CUSTOMER_ORDER_STATUSES.findIndex(s => s.key === status);
  }, [status]);

  const progress = useMemo(() => {
    if (currentStageIndex === -1) return 0;
    return (currentStageIndex + 1) / CUSTOMER_ORDER_STATUSES.length;
  }, [currentStageIndex]);

  // Animate progress when it changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const sizeConfig = {
    small: { height: 24, iconSize: 12, labelSize: 10, gap: 4 },
    medium: { height: 40, iconSize: 18, labelSize: 12, gap: 6 },
    large: { height: 60, iconSize: 24, labelSize: 14, gap: 8 },
  };

  const config = sizeConfig[size];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getStageColor = (index: number) => {
    if (index < currentStageIndex) return '#4CAF50'; // Completed - green
    if (index === currentStageIndex) return '#FF9800'; // Current - orange
    return '#E0E0E0'; // Future - gray
  };

  return (
    <View style={styles.container}>
      {/* Progress Background Bar */}
      <View style={[styles.progressBarBackground, { height: config.height / 6 }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth,
              backgroundColor: '#4CAF50',
              height: '100%',
            },
          ]}
        />
      </View>

      {/* Status Icons */}
      <View style={[styles.stagesContainer, { gap: config.gap }]}>
        {CUSTOMER_ORDER_STATUSES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const color = getStageColor(index);

          return (
            <View key={stage.key} style={styles.stageWrapper}>
              <View
                style={[
                  styles.stageIcon,
                  {
                    width: config.iconSize * 1.5,
                    height: config.iconSize * 1.5,
                    borderRadius: config.iconSize * 0.75,
                    backgroundColor: isCurrent ? color : isCompleted ? '#4CAF50' : '#f0f0f0',
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: color,
                  },
                ]}
              >
                <Ionicons
                  name={stage.icon}
                  size={config.iconSize}
                  color={isCurrent || isCompleted ? 'white' : '#999'}
                />
              </View>
              {size !== 'small' && (
                <Text
                  style={[
                    styles.stageLabel,
                    {
                      fontSize: config.labelSize,
                      color: isCurrent ? '#FF9800' : '#666',
                      fontWeight: isCurrent ? '600' : '400',
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

      {/* Current Status Text */}
      <Text style={styles.statusText}>
        Current: <Text style={styles.statusBold}>{status.replace(/_/g, ' ')}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  progressBarBackground: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    borderRadius: 4,
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stageWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stageIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stageLabel: {
    textAlign: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusBold: {
    fontWeight: '600',
    color: '#FF9800',
  },
});
