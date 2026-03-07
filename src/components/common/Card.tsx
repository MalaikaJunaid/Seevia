import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SHADOWS, SPACING } from '@/src/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: boolean;
  shadow?: boolean;
}

export function Card({
  children,
  style,
  padding = true,
  shadow = true,
}: CardProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          padding: padding ? SPACING.md : 0,
        },
        shadow && SHADOWS.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
});
