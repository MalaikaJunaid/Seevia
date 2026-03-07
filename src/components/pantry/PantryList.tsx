import React, { useState, useMemo } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING } from '@/src/theme';
import { PantryItem } from '@/src/models/PantryItem';

// Refactored Seevia Components
import { PantryCard } from './PantryCard';
import { EmptyState } from '../common/EmptyState';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Input } from '../common/Input';

interface PantryListProps {
  items: PantryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onItemPress: (item: PantryItem) => void;
  onDeleteItem: (id: string) => void;
}

/**
 * Smart Pantry List Controller.
 * Handles inventory searching and high-contrast rendering for Seevia.
 */
export function PantryList({
  items,
  isLoading,
  onRefresh,
  onItemPress,
  onDeleteItem,
}: PantryListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // AI-Assisted Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  if (isLoading && items.length === 0) {
    return <LoadingSpinner message="Syncing your pantry..." />;
  }

  return (
    <View style={styles.container}>
      <Input
        placeholder="Search pantry (e.g., 'Medicine')"
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon="search"
        style={styles.searchBar}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PantryCard
            item={item}
            onPress={() => onItemPress(item)}
            onDelete={() => onDeleteItem(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={searchQuery ? 'search-outline' : 'basket-outline'}
            title={searchQuery ? 'No matches found' : 'Pantry is empty'}
            message={
              searchQuery
                ? `We couldn't find "${searchQuery}" in your inventory.`
                : "Your scanned items will appear here."
            }
          />
        }
        accessibilityRole="list"
        accessibilityLabel="Inventory list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    marginBottom: SPACING.md,
  },
  listContent: {
    paddingBottom: 100, // Space for FloatingMicButton
    flexGrow: 1,
  },
});
