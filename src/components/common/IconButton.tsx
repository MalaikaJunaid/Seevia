import React from 'react';
import { StyleSheet, TouchableOpacity, View, AccessibilityRole } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Theme
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING } from '@/theme';
import hapticService from '@/services/common/haptic.service';

type IconButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
}

/**
 * IconButton Component for Seevia UI
 * Reusable button component with just an icon and haptic feedback
 */
function IconButton({
  icon,
  onPress,
  size = 'medium',
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}: IconButtonProps) {
  const iconSize = getIconSize(size);
  const backgroundColor = getBackgroundColor(variant);
  const iconColor = getIconColor(variant);
  const containerSize = getContainerSize(size);

  const handlePress = async () => {
    if (!disabled) {
      await hapticService.light();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

function getIconSize(size: IconButtonSize): number {
  switch (size) {
    case 'small':
      return 16;
    case 'large':
      return 28;
    case 'medium':
    default:
      return 20;
  }
}

function getContainerSize(size: IconButtonSize): number {
  switch (size) {
    case 'small':
      return 32;
    case 'large':
      return 48;
    case 'medium':
    default:
      return 40;
  }
}

function getBackgroundColor(variant: IconButtonVariant): string {
  switch (variant) {
    case 'primary':
      return `${theme.primary}20`;
    case 'secondary':
      return theme.card;
    case 'danger':
      return `${theme.danger}20`;
    case 'success':
      return `${theme.success}20`;
    default:
      return `${theme.primary}20`;
  }
}

function getIconColor(variant: IconButtonVariant): string {
  switch (variant) {
    case 'primary':
      return theme.primary;
    case 'secondary':
      return theme.textSecondary;
    case 'danger':
      return theme.danger;
    case 'success':
      return theme.success;
    default:
      return theme.primary;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IconButton;