import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/src/theme';
import { Card } from '../common/Card';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';
import TtsService from '@/src/services/voice/TtsService';

interface ShoppingItem {
  id: string;
  name: string;
  aisle: string;
  quantity: string;
  isPurchased: boolean;
}

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggleItem: (id: string) => void;
}

/**
 * Interactive Shopping List for Seevia.
 * Connects pantry needs to in-store navigation with high-contrast UI.
 */
export function ShoppingList({ items, onToggleItem }: ShoppingListProps) {
  
  const handleToggle = (item: ShoppingItem) => {
    HapticFeedback.lightTap();
    if (!item.isPurchased) {
      TtsService.speak(`${item.name} marked as found.`);
    }
    onToggleItem(item.id);
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <Card 
      style={[
        styles.itemCard, 
        { opacity: item.isPurchased ? 0.6 : 1, borderColor: item.isPurchased ? theme.success : theme.cardBorder }
      ]}
    >
      <TouchableOpacity 
        style={styles.content} 
        onPress={() => handleToggle(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isPurchased }}
        accessibilityLabel={`${item.name}, Aisle ${item.aisle}. ${item.isPurchased ? 'Purchased' : 'Not purchased'}`}
      >
        <View style={[
          styles.checkbox, 
          { borderColor: item.isPurchased ? theme.success : theme.primary, 
            backgroundColor: item.isPurchased ? theme.success : 'transparent' }
        ]}>
          {item.isPurchased && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>

        <View style={styles.textContainer}>
          <Text style={[
            styles.itemName, 
            { color: theme.text, textDecorationLine: item.isPurchased ? 'line-through' : 'none' }
          ]}>
            {item.name}
          </Text>
          <Text style={[styles.itemDetail, { color: theme.textSecondary }]}>
            Qty: {item.quantity} • Aisle {item.aisle}
          </Text>
        </View>

        {!item.isPurchased && (
          <View style={[styles.aisleBadge, { backgroundColor: `${theme.primary}20` }]}>
            <Text style={[styles.aisleText, { color: theme.primary }]}>A{item.aisle}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      ListHeaderComponent={
        <Text style={[styles.header, { color: theme.text }]}>Today's Trip</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  header: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.md,
    fontSize: 24,
  },
  itemCard: {
    marginBottom: SPACING.sm,
    padding: 0,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    fontSize: 17,
  },
  itemDetail: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    marginTop: 2,
  },
  aisleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  aisleText: {
    fontWeight: '900',
    fontSize: 12,
  },
});
