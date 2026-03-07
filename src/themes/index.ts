/**
 * Seevia Theme Barrel Export
 * Central entry point for Colors, Spacing, Typography, and Shadows.
 */

import { DARK_THEME, LIGHT_THEME, ThemeColors } from './colors';
import { TYPOGRAPHY } from './typography';
import { SPACING, LAYOUT } from './spacing';
import { ACCESSIBILITY, ACCESSIBLE_LAYOUT } from './accessibility';

export { DARK_THEME, LIGHT_THEME, TYPOGRAPHY, SPACING, LAYOUT, ACCESSIBILITY, ACCESSIBLE_LAYOUT };
export type { ThemeColors };

// Unified Radius (Consolidated from index and spacing)
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Professional Shadow Styles for UI Depth
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Global Design Token Export
 */
export const SEEVIA_THEME = {
  colors: {
    light: LIGHT_THEME,
    dark: DARK_THEME,
  },
  typography: TYPOGRAPHY,
  spacing: SPACING,
  layout: LAYOUT,
  radius: RADIUS,
  shadows: SHADOWS,
  accessibility: ACCESSIBILITY,
};
