/**
 * Seevia Accessibility Standards
 * Defines the functional constraints for PWD-centric design.
 */

export const ACCESSIBILITY = {
  // WCAG 2.1 Compliance Constants
  MIN_TOUCH_TARGET: 44,
  HIGH_CONTRAST_RATIO: 7.1, // AAA Standard
  
  // Specialized Color Overrides (For Vision Impairments)
  COLOR_BLIND_PALETTE: {
    success: '#0072B2', // Sky Blue (Higher visibility than green for many)
    danger: '#D55E00',  // Vermillion (Highly distinct from green)
    warning: '#F0E442', // Yellow
  },

  // Haptic Feedback Patterns (Duration in ms)
  HAPTIC_PATTERNS: {
    SOS_ACTIVE: [0, 500, 200, 500], // Long pulse for emergency
    SCAN_SUCCESS: [100],            // Short "blip" for product found
    ERROR_ALERT: [200, 100, 200],   // Triple stutter
  },

  // Screen Reader Specific Settings
  SCREEN_READER: {
    ANNOUNCEMENT_TIMEOUT: 1000,
    MAX_CHAR_PER_ANNOUNCEMENT: 200,
  },
  
  // Visual Scaling Limits
  TEXT_SCALING: {
    MIN_BODY_SIZE: 16,
    MAX_SCALING_FACTOR: 2.0, // Allow users to double text size without breaking layout
  }
};

/**
 * Layout Utilities for Accessibility
 */
export const ACCESSIBLE_LAYOUT = {
  // Ensures focus rings are visible
  focusOutlineWidth: 3,
  focusOutlineColor: '#FF7A00', // Seevia Orange
  
  // Standard spacing to prevent accidental taps
  elementGutter: 12,
};
