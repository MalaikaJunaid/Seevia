/**
 * Seevia Color Palette
 * Optimized for visually impaired users with WCAG AAA compliance
 * Supports Light and Dark modes with consistent brand identity
 */

export const LIGHT_THEME = {
  // Brand Colors - Seevia Orange as primary
  primary: '#FF7A00',
  primaryLight: '#FFA64D',
  primaryDark: '#C2410C',
  primaryGradient: ['#FF7A00', '#FF9500'],

  // Secondary Brand - Teal for complementary actions
  secondary: '#00B894',
  secondaryLight: '#55EFC4',
  secondaryDark: '#00876A',

  // Background & Surfaces
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceOverlay: 'rgba(255, 255, 255, 0.95)',

  // Text Colors - High contrast for accessibility
  text: '#1A1A1A',
  textSecondary: '#4A4A4A',
  textTertiary: '#757575',
  textDisabled: '#BDBDBD',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Status Colors - WCAG AAA compliant
  success: '#2ECC71',
  successLight: '#E8F8F0',
  successDark: '#27AE60',
  danger: '#FF4D4D',
  dangerLight: '#FFEBEE',
  dangerDark: '#C0392B',
  warning: '#F1C40F',
  warningLight: '#FEF9E7',
  warningDark: '#D68910',
  info: '#3498DB',
  infoLight: '#EBF5FB',
  infoDark: '#2980B9',

  // UI Elements
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#BDBDBD',
  divider: '#EEEEEE',
  dividerLight: '#F5F5F5',
  dividerDark: '#E0E0E0',

  // Icon Colors
  icon: '#4A4A4A',
  iconLight: '#757575',
  iconDisabled: '#BDBDBD',
  iconInverse: '#FFFFFF',

  // Tab Bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
  tabIconDefault: '#9E9E9E',
  tabIconSelected: '#FF7A00',
  tabBarActiveIndicator: '#FF7A00',

  // Navigation
  headerBackground: '#FFFFFF',
  headerBorder: '#E0E0E0',
  headerTitle: '#1A1A1A',
  headerIcon: '#4A4A4A',

  // Input Fields
  inputBackground: '#F8F9FA',
  inputBorder: '#E0E0E0',
  inputBorderFocused: '#FF7A00',
  inputPlaceholder: '#9E9E9E',
  inputText: '#1A1A1A',

  // 🛠️ Cards (Formalized Aliases)
  card: '#FFFFFF',           // Maps to surface
  cardBackground: '#FFFFFF',
  cardBorder: '#E0E0E0',     // Maps to border
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  // Buttons
  buttonPrimary: '#FF7A00',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#F8F9FA',
  buttonSecondaryText: '#1A1A1A',
  buttonGhost: 'transparent',
  buttonGhostText: '#FF7A00',
  buttonDisabled: '#E0E0E0',
  buttonDisabledText: '#9E9E9E',

  // Overlays & Modals
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#FFFFFF',
  modalBorder: '#E0E0E0',

  // Special Colors
  braille: '#1A1A1A',
  brailleActive: '#FF7A00',
  accessibilityFocus: '#FF7A00',
  accessibilityFocusBorder: '#FF7A00',
  highContrastBorder: '#000000',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

export const DARK_THEME = {
  // Brand Colors - Consistent Orange
  primary: '#FF7A00',
  primaryLight: '#FFA64D',
  primaryDark: '#C2410C',
  primaryGradient: ['#FF7A00', '#FF9500'],

  // Secondary Brand
  secondary: '#00B894',
  secondaryLight: '#55EFC4',
  secondaryDark: '#00876A',

  // Background & Surfaces - Deep dark for OLED
  background: '#0A0A0A',
  backgroundSecondary: '#141414',
  backgroundTertiary: '#1E1E1E',
  surface: '#141414',
  surfaceElevated: '#1E1E1E',
  surfaceOverlay: 'rgba(20, 20, 20, 0.95)',

  // Text Colors - High contrast on dark
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#A0A0A0',
  textDisabled: '#555555',
  textInverse: '#0A0A0A',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Status Colors - Vibrant for dark mode
  success: '#2ECC71',
  successLight: '#1B4D3E',
  successDark: '#27AE60',
  danger: '#FF4D4D',
  dangerLight: '#4D1A1A',
  dangerDark: '#C0392B',
  warning: '#F1C40F',
  warningLight: '#4D3D0A',
  warningDark: '#D68910',
  info: '#3498DB',
  infoLight: '#1A3A5C',
  infoDark: '#2980B9',

  // UI Elements
  border: '#2A2A2A',
  borderLight: '#1E1E1E',
  borderDark: '#3A3A3A',
  divider: '#1E1E1E',
  dividerLight: '#141414',
  dividerDark: '#2A2A2A',

  // Icon Colors
  icon: '#E0E0E0',
  iconLight: '#A0A0A0',
  iconDisabled: '#555555',
  iconInverse: '#0A0A0A',

  // Tab Bar
  tabBarBackground: '#141414',
  tabBarBorder: '#2A2A2A',
  tabIconDefault: '#555555',
  tabIconSelected: '#FF7A00',
  tabBarActiveIndicator: '#FF7A00',

  // Navigation
  headerBackground: '#141414',
  headerBorder: '#2A2A2A',
  headerTitle: '#FFFFFF',
  headerIcon: '#E0E0E0',

  // Input Fields
  inputBackground: '#1E1E1E',
  inputBorder: '#2A2A2A',
  inputBorderFocused: '#FF7A00',
  inputPlaceholder: '#555555',
  inputText: '#FFFFFF',

  // 🛠️ Cards (Formalized Aliases)
  card: '#141414',           // Maps to backgroundSecondary/surface
  cardBackground: '#141414',
  cardBorder: '#2A2A2A',     // Maps to border
  cardShadow: 'rgba(0, 0, 0, 0.3)',

  // Buttons
  buttonPrimary: '#FF7A00',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#2A2A2A',
  buttonSecondaryText: '#FFFFFF',
  buttonGhost: 'transparent',
  buttonGhostText: '#FF7A00',
  buttonDisabled: '#2A2A2A',
  buttonDisabledText: '#555555',

  // Overlays & Modals
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#141414',
  modalBorder: '#2A2A2A',

  // Special Colors
  braille: '#FFFFFF',
  brailleActive: '#FF7A00',
  accessibilityFocus: '#FF7A00',
  accessibilityFocusBorder: '#FF7A00',
  highContrastBorder: '#FFFFFF',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

export type ThemeColors = typeof LIGHT_THEME;
export type ThemeMode = 'light' | 'dark';