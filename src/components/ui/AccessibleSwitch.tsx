/**
 * Accessible Switch Component
 * WCAG AAA compliant toggle switch with haptic feedback and screen reader support
 */

import React, { useRef } from 'react';
import { Switch, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import hapticService from '@/services/common/haptic.service';

export interface AccessibleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  enableHaptics?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export const AccessibleSwitch: React.FC<AccessibleSwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  icon,
  enableHaptics = true,
  accessibilityHint,
  testID,
}) => {
  const switchRef = useRef<any>(null);

  const handleToggle = async (newValue: boolean) => {
    onValueChange(newValue);
    
    if (enableHaptics) {
      // Different haptic patterns for on/off
      await hapticService.trigger(newValue ? 'medium' : 'soft');
    }

    // Announce state change to screen reader
    const announcement = `${label} ${newValue ? 'enabled' : 'disabled'}`;
    await AccessibilityInfo.announceForAccessibility(announcement);
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint || description}
      testID={testID}
    >
      <View style={styles.leftContainer}>
        {icon && (
          <Ionicons
            name={icon}
            size={24}
            color={theme.primary}
            style={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          <Text
            style={[styles.label, { color: theme.text }]}
            allowFontScaling={true}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[styles.description, { color: theme.textSecondary }]}
              allowFontScaling={true}
            >
              {description}
            </Text>
          )}
        </View>
      </View>

      <Switch
        ref={switchRef}
        value={value}
        onValueChange={handleToggle}
        trackColor={{
          false: theme.cardBorder,
          true: theme.primaryLight,
        }}
        thumbColor={value ? theme.primary : theme.textTertiary}
        accessible={true}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  description: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
});
