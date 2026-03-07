import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';

interface ExpiryBadgeProps {
  status: {
    isExpired: boolean;
    isExpiringSoon: boolean;
    message: string;
  };
}

/**
 * Expiry Status Badge for Seevia.
 * Translates AI-calculated dates into high-contrast visual cues.
 */
export function ExpiryBadge({ status }: ExpiryBadgeProps) {
  const { isExpired, isExpiringSoon, message } = status;

  // Seevia Color Logic
  const getColors = () => {
    if (isExpired) return { bg: `${theme.danger}20`, text: theme.danger, icon: 'alert-circle' };
    if (isExpiringSoon) return { bg: `${theme.primary}20`, text: theme.primary, icon: 'hourglass-outline' };
    return { bg: `${theme.success}20`, text: theme.success, icon: 'checkmark-circle-outline' };
  };

  const colors = getColors();

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.bg }]}
      accessibilityLabel={`Expiry Status: ${message}`}
    >
      <Ionicons name={colors.icon as any} size={14} color={colors.text} />
      <Text style={[styles.text, { color: colors.text }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    gap: 4,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
