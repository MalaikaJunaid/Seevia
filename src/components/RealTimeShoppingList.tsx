import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRealTimeShoppingList } from '@/hooks/useRealTimeShoppingList';
import { ShoppingItem } from '@/models/ShoppingItem';
import { DARK_THEME as theme } from '@/theme/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.cardBorder,
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
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  itemCardCollected: {
    opacity: 0.6,
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
  collectedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  collectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  toggleButton: {
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonCollected: {
    backgroundColor: '#6b7280',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Real-time Shopping List Component
 * Demonstrates usage of the useRealTimeShoppingList hook with voice announcements
 */
export function RealTimeShoppingList() {
  const {
    items,
    loading,
    error,
    isRemoteUpdate,
    toggleItemStatus,
    deleteItem,
    clearCollected,
    getUncollectedCount,
  } = useRealTimeShoppingList();

  const uncollectedCount = getUncollectedCount();

  const handleToggleItem = async (item: ShoppingItem) => {
    try {
      await toggleItemStatus(item.id, !item.isCollected);
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const handleClearCollected = async () => {
    try {
      await clearCollected();
    } catch (err) {
      console.error('Failed to clear collected items:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Loading shopping list...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emptyStateText}>Error: {error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.subtitle}>
          {uncollectedCount} item{uncollectedCount !== 1 ? 's' : ''} to buy
        </Text>

        {isRemoteUpdate && (
          <View style={styles.remoteUpdateBadge}>
            <Text style={styles.remoteUpdateText}>Updated by caregiver</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Your shopping list is empty</Text>
            <Text style={styles.emptyStateText}>Add items to get started</Text>
          </View>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.itemCard, item.isCollected && styles.itemCardCollected]}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>
                  Qty: {item.quantity} {item.unit}
                </Text>
                {item.isCollected && (
                  <View style={styles.collectedBadge}>
                    <Text style={styles.collectedText}>Collected</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  item.isCollected && styles.toggleButtonCollected,
                ]}
                onPress={() => handleToggleItem(item)}
              >
                <Text style={styles.toggleButtonText}>
                  {item.isCollected ? 'Mark Uncollected' : 'Mark Collected'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {items.some((item) => item.isCollected) && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCollected}>
            <Text style={styles.clearButtonText}>Clear Collected Items</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}