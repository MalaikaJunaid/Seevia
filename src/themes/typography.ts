import { Platform, TextStyle } from 'react-native';

/**
 * Seevia Typography System
 * Optimized for high legibility and accessibility (PWD focus).
 */

const family = Platform.select({
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

export const TYPOGRAPHY: Record<string, TextStyle> = {
  // Main Headlines (App Titles, SOS Headers)
  h1: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: family?.bold,
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  
  // Section Headers (Pantry Categories, Settings)
  h2: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: family?.bold,
    lineHeight: 30,
  },

  // Interactive Elements (Buttons, Voice Commands)
  button: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: family?.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.25,
  },

  // Standard Information (Product Names, Descriptions)
  body: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: family?.regular,
    lineHeight: 24, // Increased line height for better readability
  },

  // Secondary Info (Expiry Dates, Time Stamps)
  caption: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: family?.regular,
    color: '#8E8E8E',
  },

  // Technical Info (Barcode data, System logs)
  code: {
    fontSize: 14,
    fontFamily: family?.mono,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
};

/**
 * Helper to get a specific typography style
 */
export const getTextStyle = (type: keyof typeof TYPOGRAPHY): TextStyle => {
  return TYPOGRAPHY[type];
};
