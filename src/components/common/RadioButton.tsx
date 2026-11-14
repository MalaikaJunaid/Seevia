import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Theme
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';

interface RadioButtonProps {
  selected: boolean;
  onPress: () => void;
  label: string;
  description?: string;
  value: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

function RadioButton({
  selected,
  onPress,
  label,
  description,
  value,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: RadioButtonProps) {
  const handlePress = async () => {
    if (!disabled && !selected) {
      await hapticService.light();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && { opacity: 0.5 },
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <View
        style={[
          styles.radioCircle,
          {
            borderColor: selected ? theme.primary : theme.cardBorder,
            backgroundColor: selected ? `${theme.primary}20` : 'transparent',
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.radioInner,
              { backgroundColor: theme.primary },
            ]}
          />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            {
              color: disabled ? theme.disabledText : theme.text,
              fontWeight: selected ? '700' : '600',
            },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              styles.description,
              { color: theme.textSecondary },
            ]}
          >
            {description}
          </Text>
        )}
      </View>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={theme.primary}
          style={styles.checkmark}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 56,
    gap: SPACING.md,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
  },
  description: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
    fontSize: 12,
  },
  checkmark: {
    marginLeft: SPACING.sm,
  },
});

export default RadioButton;