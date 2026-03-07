import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/src/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

/**
 * Global Loading Spinner for Seevia AI Ecosystem.
 * Used primarily during Vision analysis and Pantry data synchronization.
 */
export function LoadingSpinner({ message, size = 'large' }: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  message: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
    textAlign: 'center',
    fontWeight: '500',
  },
});
