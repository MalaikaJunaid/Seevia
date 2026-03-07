import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Seevia Core Theme
import { DARK_THEME as theme } from '@/src/theme/colors';

/**
 * SF Symbols to Material Icons mappings for Seevia.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'archivebox.fill': 'archive', // For Pantry
  'eye.fill': 'visibility',     // For Vision
  'exclamationmark.triangle.fill': 'report-problem', // For Emergency
} as IconMapping;

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Cross-platform Icon component.
 * Uses Material Icons as a fallback for Android and Web.
 */
export function IconSymbol({
  name,
  size = 24,
  color = theme.textSecondary,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
