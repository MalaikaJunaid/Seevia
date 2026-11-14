import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRealTimePantry } from '@/hooks/useRealTimePantry';
import { usePantry } from '@/hooks/usePantry'; 
import { PantryItemInput, PantryCategory } from '@/models/PantryItem'; 
import { DARK_THEME as theme } from '@/theme/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: (theme as any).border || '#333333', 
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  remoteUpdateBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  remoteUpdateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    backgroundColor: theme.backgroundSecondary, 
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: (theme as any).border || '#333333', 
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: theme.text,
  },
  itemExpiry: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  mainAddButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32, // Extra padding at the bottom for scrolling
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Real-time Pantry List Component
 * Uses WebSocket listener for instant UI updates and tactile hooks for actions.
 */
export function RealTimePantryList() {
  // Read real-time data from useRealTimePantry
  const { items, loading, error } = useRealTimePantry();
  
  // Perform writes using usePantry (so we get tactile haptics!)
  const { addItem, updateItem } = usePantry(); 

  const handleAddItem = async () => {
    const newItem: PantryItemInput = {
      name: 'Milk',
      category: PantryCategory.DAIRY, 
      quantity: 2,
      unit: 'liters',
      lowStockThreshold: 1,
    };

    try {
      await addItem(newItem);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      await updateItem(itemId, { quantity: newQuantity });
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Loading pantry...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Render error.message instead of the Error object to prevent crashes */}
          <Text style={styles.emptyStateText}>Error: {error.message}</Text> 
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Pantry</Text>
        <Text style={styles.subtitle}>{items.length} items</Text>
      </View>

      <ScrollView style={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Your pantry is empty</Text>
            <Text style={styles.emptyStateText}>Add items to get started</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <View style={styles.itemDetails}>
                <View>
                  <Text style={styles.itemQuantity}>
                    Qty: {item.quantity} {item.unit}
                  </Text>
                  {item.expiryDate && (
                    <Text style={styles.itemExpiry}>
                      Expires: {new Date(item.expiryDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Text style={styles.addButtonText}>+1</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.mainAddButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add Demo Item</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}