import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

/**
 * Horizontal Category Scroller for Seevia Pantry.
 * Features high-contrast chips and tactile feedback.
 */
export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  
  const handleSelect = (category: string | null) => {
    HapticFeedback.lightTap();
    onSelectCategory(category);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          onPress={() => handleSelect(null)}
          style={[
            styles.chip,
            {
              backgroundColor: selectedCategory === null ? theme.primary : theme.card,
              borderColor: selectedCategory === null ? theme.primary : theme.cardBorder,
            },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedCategory === null }}
          accessibilityLabel="All items"
        >
          <Text
            style={[
              styles.chipText,
              { color: selectedCategory === null ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => handleSelect(category)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === category ? theme.primary : theme.card,
                borderColor: selectedCategory === category ? theme.primary : theme.cardBorder,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === category }}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedCategory === category ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontSize: 14,
  },
});
