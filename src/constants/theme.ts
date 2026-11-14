/**
 * Seevia Theme Constants (Legacy - Use src/theme/index.ts instead)
 * This file is maintained for backward compatibility
 * @deprecated Import from src/theme/index.ts instead
 */

// Re-export from the main theme file
export {
  LIGHT_THEME,
  DARK_THEME,
  type ThemeColors,
  type ThemeMode,
} from '../theme/colors';

export {
  TYPOGRAPHY,
  TYPOGRAPHY_VALUES,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,
} from '../theme/typography';

export { SPACING, RADIUS, LAYOUT } from '../theme/spacing';

export { ACCESSIBILITY } from '../theme/accessibility';

export { SHADOWS, OPACITY, Z_INDEX, ANIMATION, createTheme, type Theme } from '../theme/index';