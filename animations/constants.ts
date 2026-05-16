import { Easing } from 'react-native-reanimated';

/**
 * Yo-Foo Animation Constants
 * Standardized motion tokens for a premium, consistent feel.
 */
export const ANIMATION = {
  // Standard Durations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 450,
    emphasis: 600,
  },

  // Spring Configurations (The "Premium" feel)
  spring: {
    // For general UI shifts (fluid but professional)
    standard: {
      damping: 22,
      stiffness: 100,
      mass: 1,
    },
    // For interactive feedback (buttons, cards)
    snappy: {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    },
    // For high-energy moments (success checkmarks, etc.)
    bouncy: {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    },
    // For heavy elements (bottom sheets, large modals)
    heavy: {
      damping: 28,
      stiffness: 80,
      mass: 1.2,
    },
  },

  // Easing Presets
  easing: {
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0.0, 1, 1),
    sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  },

  // Common Scale Values
  scale: {
    pressIn: 0.96, // Subtle scale down
    pressOut: 1.0,
    active: 1.05,  // Slight pop for selected items
  },
} as const;
