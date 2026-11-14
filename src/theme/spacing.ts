/**
 * Seevia Spacing System
 * Consistent 4-point grid for layout
 * Optimized for accessibility with generous touch targets
 */

export const SPACING = {
  // Base: 4px grid
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,

  // Aliases for common use cases
  gutter: 16,
  gap: 8,
  padding: 16,
  margin: 16,
  radius: 12,

  // Accessibility-specific spacing
  touchTarget: 48, // WCAG minimum touch target
  focusRing: 3,
  highContrastBorder: 2,
};

// Border Radius
export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Layout dimensions
export const LAYOUT = {
  // Screen widths
  screenWidth: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    '2xl': 1400,
  },

  // Component heights
  buttonHeight: {
    sm: 36,
    md: 44,
    lg: 52,
  },

  inputHeight: {
    sm: 40,
    md: 48,
    lg: 56,
  },

  // Card sizes
  card: {
    sm: 8,
    md: 16,
    lg: 24,
  },
};
