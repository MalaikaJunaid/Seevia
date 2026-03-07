import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
}

export function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    // Tactile confirmation of state change
    HapticFeedback.lightTap();
    setIsOpen((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.heading, { borderBottomColor: isOpen ? theme.cardBorder : 'transparent' }]}
        onPress={toggleOpen}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${isOpen ? 'Collapse' : 'Expand'} ${title}`}
        accessibilityState={{ expanded: isOpen }}
      >
        <Ionicons
          name={isOpen ? "chevron-down" : "chevron-forward"}
          size={20}
          color={theme.primary}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.content, { backgroundColor: theme.backgroundSecondary }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    padding: SPACING.md,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
