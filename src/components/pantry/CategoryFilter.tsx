import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { PANTRY_CATEGORIES } from '@/constants/categories'; // 🛠️ Added to fetch icons

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  
  const handleSelect = (category: string | null) => {
    hapticService.trigger('light');
    onSelectCategory(category);
  };

  // 🛠️ Helper to fetch the beautiful labels and emojis we just defined
  const getCategoryDetails = (categoryValue: string) => {
    const found = PANTRY_CATEGORIES.find(c => c.value === categoryValue);
    return found ? { label: found.label, icon: found.icon } : { label: categoryValue, icon: '📦' };
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
              // 🛠️ FIXED: Used backgroundSecondary and safe border fallback
              backgroundColor: selectedCategory === null ? theme.primary : theme.backgroundSecondary,
              borderColor: selectedCategory === null ? theme.primary : ((theme as any).border || '#333333'),
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
            📋 All
          </Text>
        </TouchableOpacity>

        {categories.map((category) => {
          const { label, icon } = getCategoryDetails(category);

          return (
            <TouchableOpacity
              key={category}
              onPress={() => handleSelect(category)}
              style={[
                styles.chip,
                {
                  // 🛠️ FIXED: Used backgroundSecondary and safe border fallback
                  backgroundColor: selectedCategory === category ? theme.primary : theme.backgroundSecondary,
                  borderColor: selectedCategory === category ? theme.primary : ((theme as any).border || '#333333'),
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === category }}
              accessibilityLabel={`${label} category`}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedCategory === category ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {icon} {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginVertical: SPACING.sm 
  },
  scrollContent: { 
    paddingHorizontal: SPACING.md, 
    gap: SPACING.sm,
    flexDirection: 'row', // Ensures horizontal layout for the gap property
  },
  chip: {
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, 
    borderWidth: 1, 
    minWidth: 60,
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row', // Align icon and text side-by-side
  },
  chipText: { 
    ...TYPOGRAPHY.caption, 
    fontWeight: '700', 
    fontSize: 14 
  },
});