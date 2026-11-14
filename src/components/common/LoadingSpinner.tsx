import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

function LoadingSpinner({
  message,
  size = 'large',
  accessible = true,
  accessibilityLabel = 'Loading',
  accessibilityHint,
}: LoadingSpinnerProps) {
  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint || message}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text
          style={[styles.message, { color: theme.textSecondary }]}
          accessible={true}
          accessibilityRole="text"
        >
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

export default LoadingSpinner;