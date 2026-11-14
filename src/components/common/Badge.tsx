import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Theme
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Badge Component for Seevia UI
 * Used to display status, counts, and labels with consistent styling
 */
function Badge({
  label,
  variant = 'primary',
  size = 'medium',
  icon,
  onPress,
  accessible = true,
  accessibilityLabel,
}: BadgeProps) {
  const backgroundColor = getBackgroundColor(variant);
  const textColor = getTextColor(variant);
  const fontSize = getSizeValue(size).fontSize;
  const padding = getSizeValue(size).padding;
  const iconSize = getSizeValue(size).iconSize;

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingHorizontal: padding.horizontal,
      paddingVertical: padding.vertical,
    },
  ];

  const textStyle = [
    styles.text,
    {
      color: textColor,
      fontSize,
      fontWeight: size === 'small' ? '600' : '700',
    },
  ];

  const content = (
    <View style={[styles.content, icon && styles.withIcon]}>
      {icon && <Ionicons name={icon} size={iconSize} color={textColor} style={styles.icon} />}
      <Text style={textStyle}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <View
        style={containerStyle}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityHint="Press to interact with badge"
      >
        {content}
      </View>
    );
  }

  return (
    <View
      style={containerStyle}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="image"
    >
      {content}
    </View>
  );
}

function getBackgroundColor(variant: BadgeVariant): string {
  switch (variant) {
    case 'primary':
      return `${theme.primary}20`;
    case 'success':
      return `${theme.success}20`;
    case 'warning':
      return `${theme.warning}20`;
    case 'danger':
      return `${theme.danger}20`;
    case 'info':
      return `${theme.info}20`;
    default:
      return `${theme.primary}20`;
  }
}

function getTextColor(variant: BadgeVariant): string {
  switch (variant) {
    case 'primary':
      return theme.primary;
    case 'success':
      return theme.success;
    case 'warning':
      return theme.warning;
    case 'danger':
      return theme.danger;
    case 'info':
      return theme.info;
    default:
      return theme.primary;
  }
}

function getSizeValue(size: BadgeSize) {
  switch (size) {
    case 'small':
      return {
        fontSize: 10,
        padding: { horizontal: SPACING.sm, vertical: SPACING.xs },
        iconSize: 12,
      };
    case 'large':
      return {
        fontSize: 16,
        padding: { horizontal: SPACING.lg, vertical: SPACING.md },
        iconSize: 18,
      };
    case 'medium':
    default:
      return {
        fontSize: 12,
        padding: { horizontal: SPACING.md, vertical: SPACING.sm },
        iconSize: 14,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  withIcon: {
    gap: SPACING.xs,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default Badge;