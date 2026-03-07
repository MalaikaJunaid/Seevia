import { Platform } from 'react-native';

/**
 * Seevia Unified Design System
 * Merged & Optimized for COMSATS Final Year Project Standards.
 */

export const COLORS = {
  primary: '#FF7A00',       // Seevia Orange
  primaryLight: '#FFA64D',
  success: '#2ECC71',
  danger: '#FF4D4D',
  warning: '#F1C40F',

  light: {
    background: '#FFFFFF',
    surface: '#F7F7F7',      // Soft grey for cards/sections
    text: '#1A1A1A',         // Charcoal
    textSecondary: '#555555',
    border: '#E5E5E5',
    icon: '#555555',
    tabIconDefault: '#999999',
    tabIconSelected: '#FF7A00',
  },

  dark: {
    background: '#121212',   // Deeper dark for OLED battery saving
    surface: '#1E1E1E',      // Elevation level 1 (Cards)
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#333333',
    icon: '#CCCCCC',
    tabIconDefault: '#777777',
    tabIconSelected: '#FF7A00',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
};

export const FONTS = Platform.select({
  ios: {
    regular: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  android: {
    regular: 'sans-serif',
    bold: 'sans-serif-medium',
    mono: 'monospace',
  },
  default: {
    regular: 'normal',
    bold: 'bold',
    mono: 'monospace',
  },
});

export const TYPOGRAPHY = {
  heading: {
    fontSize: 28,
    fontWeight: '800' as const,
    fontFamily: FONTS?.bold,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: FONTS?.bold,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: FONTS?.regular,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Barrel export for the theme
export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  fonts: FONTS,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
};
