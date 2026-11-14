/**
 * Seevia Typography System
 * Designed for voice-first PWD interfaces with readable font sizes
 * Optimized for accessibility with WCAG AAA compliance
 */

import { Platform, StyleSheet } from 'react-native';

// Font Families
export const FONT_FAMILY = Platform.select({
  ios: {
    regular: 'SF Pro Text',
    medium: 'SF Pro Text-Medium',
    semibold: 'SF Pro Text-Semibold',
    bold: 'SF Pro Text-Bold',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

// Font Sizes
export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 48,
};

// Font Weights
export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Line Heights
export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

// Letter Spacing
export const LETTER_SPACING = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
};

// Typography Styles
export const TYPOGRAPHY = StyleSheet.create({
  // Display heading - 36pt
  display: { fontSize: 57, fontWeight: "700" as const, lineHeight: 64, letterSpacing: -0.25 },
  displayLarge: {
    fontSize: 57,
    fontWeight: "700" as const,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  display: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -1,
  },

  // Main heading - 24pt
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },

  // Subheading - 20pt
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  // Subheading - 18pt
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
  },

  // Body text - 16pt (default readable size)
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // Body emphasis
  bodyBold: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // Label text - 14pt
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // Small text - 12pt
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.3,
  },

  // Button text - 16pt bold
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Caption - 11pt
  caption: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  },

  // Accessibility - Large text for visually impaired
  accessible: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 28,
    letterSpacing: 0,
  },

  accessibleLarge: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: 0,
  },
});

// Typography object for non-StyleSheet usage
export const TYPOGRAPHY_VALUES = {
  display: { fontSize: 57, fontWeight: "700" as const, lineHeight: 64, letterSpacing: -0.25 },
  displayLarge: {
    fontSize: 57,
    fontWeight: "700" as const,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  display: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
    letterSpacing: -1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  accessible: {
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  accessibleLarge: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
};
