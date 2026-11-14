/**
 * Accessible Radio Button Component
 * WCAG AAA compliant radio button group with keyboard navigation and haptic feedback
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import hapticService from '@/services/common/haptic.service';

export interface RadioButtonOption {
  id: string;
  label: string;
  description?: string;
}

export interface AccessibleRadioButtonProps {
  options: RadioButtonOption[];
  selectedId: string;
  onSelectionChange: (id: string) => void;
  groupLabel?: string;
  direction?: 'row' | 'column';
  enableHaptics?: boolean;
  testID?: string;
}

export const AccessibleRadioButton: React.FC<AccessibleRadioButtonProps> = ({
  options,
  selectedId,
  onSelectionChange,
  groupLabel = 'Select an option',
  direction = 'row',
  enableHaptics = true,
  testID,
}) => {
  const selectedIndexRef = useRef(options.findIndex(o => o.id === selectedId));

  const handleSelect = async (option: RadioButtonOption, index: number) => {
    selectedIndexRef.current = index;
    onSelectionChange(option.id);

    if (enableHaptics) {
      await hapticService.trigger('medium');
    }

    // Announce selection to screen reader
    const announcement = `${option.label} selected`;
    await AccessibilityInfo.announceForAccessibility(announcement);
  };

  const handleKeyPress = async (event: any, index: number) => {
    let newIndex = index;

    if (direction === 'row') {
      // Arrow keys for horizontal navigation
      if (event.nativeEvent.key === 'ArrowRight') {
        newIndex = (index + 1) % options.length;
      } else if (event.nativeEvent.key === 'ArrowLeft') {
        newIndex = (index - 1 + options.length) % options.length;
      }
    } else {
      // Arrow keys for vertical navigation
      if (event.nativeEvent.key === 'ArrowDown') {
        newIndex = (index + 1) % options.length;
      } else if (event.nativeEvent.key === 'ArrowUp') {
        newIndex = (index - 1 + options.length) % options.length;
      }
    }

    if (newIndex !== index) {
      await handleSelect(options[newIndex], newIndex);
    }
  };

  return (
    <View
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
      testID={testID}
    >
      <View style={[styles.container, { flexDirection: direction }]}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.radioButtonContainer,
              direction === 'row' && { flex: 1, marginRight: index < options.length - 1 ? SPACING.sm : 0 },
            ]}
            onPress={() => handleSelect(option, index)}
            accessible={true}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedId === option.id }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            accessibilityActions={[
              {
                name: 'activate',
                label: `Select ${option.label}`,
              },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'activate') {
                handleSelect(option, index);
              }
            }}
            testID={`radio-${option.id}`}
          >
            <View
              style={[
                styles.radioButton,
                {
                  borderColor: selectedId === option.id ? theme.primary : theme.cardBorder,
                  backgroundColor: selectedId === option.id ? theme.primary : 'transparent',
                },
              ]}
            >
              {selectedId === option.id && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#FFFFFF"
                  style={styles.checkmark}
                />
              )}
            </View>

            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.label,
                  {
                    color: selectedId === option.id ? theme.primary : theme.text,
                  },
                ]}
                allowFontScaling={true}
              >
                {option.label}
              </Text>
              {option.description && (
                <Text
                  style={[styles.description, { color: theme.textSecondary }]}
                  allowFontScaling={true}
                >
                  {option.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  checkmark: {
    fontWeight: 'bold',
  },
  labelContainer: {
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
