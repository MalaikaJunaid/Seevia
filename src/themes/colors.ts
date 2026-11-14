/**
 * Seevia Color Palette (Legacy - Use src/theme/colors.ts instead)
 * This file is maintained for backward compatibility
 * @deprecated Import from src/theme/colors.ts instead
 */

// Re-export from the main theme file
export {
  LIGHT_THEME,
  DARK_THEME,
  type ThemeColors,
  type ThemeMode,
} from '../theme/colors';

// Legacy type alias
export type Theme = ThemeColors;