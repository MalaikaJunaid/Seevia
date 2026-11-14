import { useCallback, useEffect, useState } from 'react';
import { PantryItem, PantryItemInput } from '@/models/PantryItem';
import { AuthService } from '@/services/firebase/auth.service';
import { expiryService } from '@/services/pantry/expiry.service'; // 🛠️ FIXED: Lowercase instance import
import { PantryService } from '@/services/pantry/pantry.service';
import { ShoppingListService } from '@/services/pantry/shoppingList.service';
import { useAccessibility } from './useAccessibility';
import { ERROR_MESSAGES } from '@/constants/config';

/**
 * Seevia Pantry Logic Hook
 * Manages inventory state, cloud synchronization, and smart analytics.
 * Note: For purely Real-Time UI reads, consider using useRealTimePantry.ts instead!
 */
export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shoppingList, setShoppingList] = useState<PantryItem[]>([]);

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
      // 🛠️ FIXED: Method name mapped to addPantryItem
      const newId = await PantryService.addPantryItem(userId, item);
      
      // Construct the item locally for an instant UI update
      const newItem: PantryItem = {
        ...item,
        id: newId || `temp_${Date.now()}`,
        userId,
        addedDate: new Date().toISOString(),
        lowStockThreshold: item.lowStockThreshold || 1,
      } as PantryItem;

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
      // 🛠️ FIXED: Method name mapped to updatePantryItem
      await PantryService.updatePantryItem(userId, itemId, updates);
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
      // 🛠️ FIXED: Method name mapped to deletePantryItem
      await PantryService.deletePantryItem(userId, itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      await triggerHapticFeedback('warning');
    } catch (err) {
      setError(ERROR_MESSAGES.FIREBASE_ERROR);
      throw err;
    }
  }, [userId, triggerHapticFeedback]);

  // Smart Analytics Helpers
  const getExpiredItems = useCallback(() => {
    return items.filter(item => expiryService.checkExpiryStatus(item).isExpired); // 🛠️ FIXED: Instance casing
  }, [items]);

  const getExpiringSoonItems = useCallback(() => {
    return items.filter(item => expiryService.checkExpiryStatus(item).isExpiringSoon); // 🛠️ FIXED: Instance casing
  }, [items]);

  const getLowStockItems = useCallback(() => {
    return items.filter(item => item.quantity <= (item.lowStockThreshold || 1));
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