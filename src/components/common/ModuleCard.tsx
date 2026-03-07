import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface ModuleCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: string | number;
  accessibilityLabel?: string;
}

/**
 * Primary Navigation Card for Seevia Dashboard.
 * Integrates Haptic feedback and high-contrast accessibility.
 */
export function ModuleCard({
  title,
  subtitle,
  icon,
  onPress,
  badge,
  accessibilityLabel,
}: ModuleCardProps) {

  const handlePress = () => {
    // Tactile confirmation for PWD accessibility
    HapticFeedback.lightTap();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || `${title}. ${subtitle}`}
      accessibilityRole="button"
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
        SHADOWS.md,
      ]}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>
      
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: theme.textSecondary },
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      {badge !== undefined && (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.primary },
          ]}
        >
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    marginRight: SPACING.md,
    width: 40,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.subheading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
