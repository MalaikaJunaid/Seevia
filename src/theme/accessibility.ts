/**
 * Seevia Accessibility Theme
 * High contrast settings for vision-safe interfaces
 * WCAG AAA compliant for maximum accessibility
 */

export const ACCESSIBILITY = {
  // High contrast borders for low-vision users
  highContrastBorder: 3,
  normalBorder: 1,

  // Large touch targets (minimum 48x48dp per WCAG 2.5.5)
  minTouchSize: 48,
  recommendedTouchSize: 56,

  // Font scaling factors
  fontScaleDefault: 1.0,
  fontScaleAccessible: 1.25,
  fontScaleMaximum: 1.5,

  // Focus indicators
  focusOutlineWidth: 3,
  focusOutlineColor: '#FF7A00', // Seevia Orange for consistency
  focusRingWidth: 2,

  // Motion reduction (respects prefers-reduced-motion)
  motionReduced: {
    duration: 0,
    delay: 0,
  },
  motionDefault: {
    duration: 300,
    delay: 0,
  },

  // Screen reader announcements
  announcementDelay: 500,
  announcementDuration: 2000,

  // Color contrast ratios (WCAG AAA)
  contrastRatio: {
    normal: 4.5, // AA
    large: 3.0, // AA Large
    enhanced: 7.0, // AAA
    enhancedLarge: 4.5, // AAA Large
  },

  // Haptic feedback patterns
  haptic: {
    light: 'selection',
    medium: 'impact',
    heavy: 'notification',
    success: 'success',
    warning: 'warning',
    error: 'error',
  },

  // Audio feedback
  audio: {
    enabled: true,
    volume: 0.8,
    speed: 1.0,
    language: 'ur', // Roman Urdu
  },

  // Visual indicators
  visual: {
    minIconSize: 24,
    minTextSize: 14,
    highContrastMode: false,
    reduceTransparency: false,
  },

  // Navigation
  navigation: {
    swipeThreshold: 50,
    doubleTapTimeout: 300,
    longPressTimeout: 500,
  },
};
