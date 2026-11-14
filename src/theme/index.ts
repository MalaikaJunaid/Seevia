/**
 * Seevia Theme Index
 * Central export for all theming utilities
 * Unified design system for Seevia app
 */

// Color themes
export { LIGHT_THEME, DARK_THEME, type ThemeColors, type ThemeMode } from './colors';

// Typography
export {
  TYPOGRAPHY,
  TYPOGRAPHY_VALUES,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,
} from './typography';

// Spacing & Layout
export { SPACING, RADIUS, LAYOUT } from './spacing';

// Accessibility
export { ACCESSIBILITY } from './accessibility';

// Shadows
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Opacity
export const OPACITY = {
  transparent: 0,
  disabled: 0.38,
  hover: 0.8,
  focus: 0.12,
  selected: 0.16,
  activated: 0.24,
  pressed: 0.32,
};

// Z-Index
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
  overlay: 1090,
  max: 9999,
};

// Animation
export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Complete theme object
export const createTheme = (mode: 'light' | 'dark' = 'light') => ({
  mode,
  colors: mode === 'light' ? LIGHT_THEME : DARK_THEME,
  typography: TYPOGRAPHY_VALUES,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  opacity: OPACITY,
  zIndex: Z_INDEX,
  animation: ANIMATION,
  accessibility: ACCESSIBILITY,
});

export type Theme = ReturnType<typeof createTheme>;
