import React from 'react';
import { StyleSheet, Switch as RNSwitch, View, Text } from 'react-native';

// Seevia Core Theme
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

function Switch({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: SwitchProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        {label && (
          <Text
            style={[styles.label, { color: disabled ? theme.disabledText : theme.text }]}
            accessible={true}
            accessibilityRole="header"
          >
            {label}
          </Text>
        )}
        {description && (
          <Text
            style={[styles.description, { color: theme.textSecondary }]}
            accessible={true}
            accessibilityRole="text"
          >
            {description}
          </Text>
        )}
      </View>

      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.cardBorder, true: `${theme.primary}80` }}
        thumbColor={value ? theme.primary : theme.textTertiary}
        ios_backgroundColor={theme.cardBorder}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 56,
  },
  labelContainer: {
    flex: 1,
    marginRight: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    fontSize: 16,
  },
  description: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
    fontSize: 12,
  },
});

export default Switch;