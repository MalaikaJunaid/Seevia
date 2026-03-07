import { useCallback, useEffect, useState } from 'react';
import { PantryItem, PantryItemInput } from '@/src/models/PantryItem';
import { AuthService } from '@/src/services/firebase/auth.service';
import { ExpiryService } from '@/src/services/pantry/expiry.service';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { ShoppingListItem, ShoppingListService } from '@/src/services/pantry/shoppingList.service';
import { useAccessibility } from './useAccessibility';
import { ERROR_MESSAGES } from '@/src/constants/config';

/**
 * Seevia Pantry Logic Hook
 * Manages inventory state, cloud synchronization, and smart analytics.
 */
export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);

  const { triggerHapticFeedback } = useAccessibility();
  const userId = AuthService.getCurrentUser()?.uid;

  // Load pantry items from cloud
  const loadItems = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const pantryItems = await PantryService.getAllItems(userId);
      setItems(pantryItems);
    } catch (err) {
      setError(ERROR_MESSAGES.FIREBASE_ERROR);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add new item with tactile confirmation
  const addItem = useCallback(async (item: PantryItemInput) => {
    if (!userId) return;

    try {
      const newItem = await PantryService.addItem(userId, item);
      setItems(prev => [newItem, ...prev]);
      await triggerHapticFeedback('success');
      return newItem;
    } catch (err) {
      setError(ERROR_MESSAGES.FIREBASE_ERROR);
      throw err;
    }
  }, [userId, triggerHapticFeedback]);

  // Update existing item
  const updateItem = useCallback(async (itemId: string, updates: Partial<PantryItemInput>) => {
    if (!userId) return;

    try {
      await PantryService.updateItem(userId, itemId, updates);
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
      await triggerHapticFeedback('medium');
    } catch (err) {
      setError(ERROR_MESSAGES.FIREBASE_ERROR);
      throw err;
    }
  }, [userId, triggerHapticFeedback]);

  // Delete item with warning haptic
  const deleteItem = useCallback(async (itemId: string) => {
    if (!userId) return;

    try {
      await PantryService.deleteItem(userId, itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      await triggerHapticFeedback('warning');
    } catch (err) {
      setError(ERROR_MESSAGES.FIREBASE_ERROR);
      throw err;
    }
  }, [userId, triggerHapticFeedback]);

  // Smart Analytics Helpers
  const getExpiredItems = useCallback(() => {
    return items.filter(item => ExpiryService.checkExpiryStatus(item).isExpired);
  }, [items]);

  const getExpiringSoonItems = useCallback(() => {
    return items.filter(item => ExpiryService.checkExpiryStatus(item).isExpiringSoon);
  }, [items]);

  const getLowStockItems = useCallback(() => {
    return items.filter(item => item.quantity <= item.lowStockThreshold);
  }, [items]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    shoppingList,
    addItem,
    updateItem,
    deleteItem,
    loadItems,
    getExpiredItems,
    getExpiringSoonItems,
    getLowStockItems,
  };
}
