/**
 * Seevia Design System - Theme Configuration
 * Optimized for High-Contrast Accessibility and COMSATS Branding Standards.
 */

export const COLORS = {
  primary: "#FF7A00", // Seevia Signature Orange
  success: "#2ECC71",
  danger: "#FF4D4D",
  warning: "#F1C40F",
  
  light: {
    background: "#FFFFFF",
    backgroundSecondary: "#F9F9F9",
    card: "#F5F5F5",
    cardBorder: "#E2E2E2",
    text: "#1A1A1A",
    textSecondary: "#6E6E6E",
    textTertiary: "#9E9E9E",
  },
  
  dark: {
    background: "#121212", // Deeper dark for better contrast
    backgroundSecondary: "#1E1E1E",
    card: "#2A2A2A",
    cardBorder: "#3A3A3A",
    text: "#FFFFFF",
    textSecondary: "#BEBEBE",
    textTertiary: "#8E8E8E",
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
};

export const TYPOGRAPHY = {
  heading: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Quick access for the primary Dark Theme used in Seevia components.
 */
export const DARK_THEME = {
  ...COLORS.dark,
  primary: COLORS.primary,
  success: COLORS.success,
  danger: COLORS.danger,
  warning: COLORS.warning,
};
