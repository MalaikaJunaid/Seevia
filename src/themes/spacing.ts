/**
 * Seevia Spacing System
 * Based on an 8-point grid for perfect scaling and touch-target accessibility.
 */

export const SPACING = {
  // Base increments
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic Layout Spacing
  screenPadding: 20, // Standard horizontal padding for all Seevia screens
  cardPadding: 16,   // Internal padding for Pantry and Shopping cards
  gutter: 12,        // Space between elements in a row
  sectionGap: 32,    // Vertical space between major UI sections
  
  // Interactive Elements
  touchTargetMin: 44, // Minimum size for buttons/links (WCAG Standard)
  iconSize: 24,
  iconSizeSm: 18,
  iconSizeLg: 32,
};

/**
 * Common Layout Utility
 */
export const LAYOUT = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
  },
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 3,
  }
};
