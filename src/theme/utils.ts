/**
 * Seevia Theme Utilities
 * Helper functions for theme-related operations
 */

import { Platform, StyleSheet } from 'react-native';
import { LIGHT_THEME, DARK_THEME, type ThemeColors } from './colors';

/**
 * Get the appropriate theme based on mode
 */
export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? DARK_THEME : LIGHT_THEME;
};

/**
 * Create a stylesheet that adapts to the current theme
 */
export const createThemedStyles = (
  styleFn: (colors: ThemeColors) => StyleSheet.NamedStyles<any>
) => {
  return (isDark: boolean) => {
    const colors = getThemeColors(isDark);
    return StyleSheet.create(styleFn(colors));
  };
};

/**
 * Get platform-specific shadow styles
 */
export const getShadowStyle = (elevation: number = 0) => {
  if (Platform.OS === 'android') {
    return { elevation };
  }

  const shadows: Record<number, any> = {
    0: {},
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    5: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
  };

  return shadows[elevation] || {};
};

/**
 * Check if a color is light or dark
 * Useful for determining text color on dynamic backgrounds
 */
export const isColorLight = (color: string): boolean => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
};

/**
 * Get appropriate text color for a background color
 */
export const getTextColorForBackground = (
  backgroundColor: string,
  lightColor: string = '#FFFFFF',
  darkColor: string = '#000000'
): string => {
  return isColorLight(backgroundColor) ? darkColor : lightColor;
};

/**
 * Adjust color opacity
 */
export const adjustColorOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Lighten a color
 */
export const lightenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);

  r = Math.min(255, Math.floor(r + (255 - r) * amount));
  g = Math.min(255, Math.floor(g + (255 - g) * amount));
  b = Math.min(255, Math.floor(b + (255 - b) * amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Darken a color
 */
export const darkenColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  let r = parseInt(hex.substr(0, 2), 16);
  let g = parseInt(hex.substr(2, 2), 16);
  let b = parseInt(hex.substr(4, 2), 16);

  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Get status color based on type
 */
export const getStatusColor = (
  type: 'success' | 'danger' | 'warning' | 'info',
  isDark: boolean
): string => {
  const colors = getThemeColors(isDark);
  switch (type) {
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    default:
      return colors.primary;
  }
};

/**
 * Get gradient colors for primary action
 */
export const getPrimaryGradient = (isDark: boolean): string[] => {
  const colors = getThemeColors(isDark);
  return colors.primaryGradient;
};

/**
 * Validate if a string is a valid hex color
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

/**
 * Convert hex to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!isValidHexColor(hex)) return null;

  const hexValue = hex.replace('#', '');
  const r = parseInt(hexValue.substr(0, 2), 16);
  const g = parseInt(hexValue.substr(2, 2), 16);
  const b = parseInt(hexValue.substr(4, 2), 16);

  return { r, g, b };
};

/**
 * Get contrast ratio between two colors (WCAG)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const luminance1 = (0.299 * rgb1.r + 0.587 * rgb1.g + 0.114 * rgb1.b) / 255;
  const luminance2 = (0.299 * rgb2.r + 0.587 * rgb2.g + 0.114 * rgb2.b) / 255;

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast meets WCAG AA standard (4.5:1)
 */
export const meetsWCAGAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 4.5;
};

/**
 * Check if contrast meets WCAG AAA standard (7:1)
 */
export const meetsWCAGAAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 7.0;
};