import { useCallback, useEffect, useState, useRef } from 'react';
import { ShoppingItem } from '@/models/ShoppingItem';
import { ShoppingListService } from '@/services/pantry/shoppingList.service';
import { AuthService } from '@/services/firebase/auth.service';
import { TrustCircleService } from '@/services/firebase/trustCircle.service';
import { UserProfileService } from '@/services/firebase/userProfile.service';
import { voiceService } from '@/services/voice/voiceService';
import { logger } from '@/utils/logger';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';

interface UseRealTimeShoppingListReturn {
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  isRemoteUpdate: boolean;
  addItem: (item: Partial<ShoppingItem>) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<ShoppingItem>) => Promise<void>;
  toggleItemStatus: (itemId: string, isCollected: boolean) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearCollected: () => Promise<void>;
  refresh: () => void;
  getUncollectedCount: () => number;
}

/**
 * Real-time Shopping List Hook
 * Provides real-time synchronization of shopping lists with voice announcements for remote updates.
 *
 * Features:
 * - Real-time sync using onSnapshot
 * - Voice announcements when caregiver updates remotely
 * - Security: Only allows access to own data or linked caregiver's data
 */
export function useRealTimeShoppingList(): UseRealTimeShoppingListReturn {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  const user = AuthService.getCurrentUser();
  const userId = user?.uid;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastUpdateRef = useRef<{ userId: string; timestamp: number } | null>(null);

  /**
   * Check if update is from remote user (caregiver)
   */
  const checkIfRemoteUpdate = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const profile = await UserProfileService.getUserProfile(userId);
      const isPWD = profile?.role === 'pwd';

      if (isPWD) {
        // For PWD, check if they have an active caregiver
        const trustCircle = await TrustCircleService.getActiveTrustCircle(userId);
        return !!trustCircle?.caregiverId;
      }

      return false;
    } catch (err) {
      logger.error('REALTIME_SHOPPING', 'Error checking remote update', err);
      return false;
    }
  }, [userId]);

  /**
   * Trigger voice announcement for remote updates
   */
  const triggerVoiceAnnouncement = useCallback(async (action: string, itemName: string, count?: number) => {
    try {
      const isRemote = await checkIfRemoteUpdate();
      if (!isRemote) return;

      const profile = await UserProfileService.getUserProfile(userId || '');
      const language = profile?.language === 'ur' ? 'ur-PK' : 'en-US';

      let message: string;
      if (language === 'ur-PK') {
        if (count && count > 1) {
          message = `آپ کے دیکھ بھال نے ${count} اشیاء ${action} کر دی ہیں`;
        } else {
          message = `آپ کے دیکھ بھال نے ${itemName} ${action} کر دیا ہے`;
        }
      } else {
        if (count && count > 1) {
          message = `Your caregiver has ${action} ${count} items`;
        } else {
          message = `Your caregiver has ${action} ${itemName}`;
        }
      }

      await voiceService.speak(message, { language, rate: 0.9 });
      logger.info('REALTIME_SHOPPING', `Voice announcement: ${message}`);
    } catch (err) {
      logger.error('REALTIME_SHOPPING', 'Error triggering voice announcement', err);
    }
  }, [userId, checkIfRemoteUpdate]);

  /**
   * Setup real-time listener for shopping list items
   */
  const setupRealTimeListener = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user profile to determine role
      const profile = await UserProfileService.getUserProfile(userId);
      const isCaregiver = profile?.role === 'caregiver';

      let shoppingQuery;

      if (isCaregiver) {
        // Caregiver: Get all PWDs they're linked to
        const trustCircles = await TrustCircleService.getCaregiverTrustCircles(userId);
        const pwdIds = trustCircles.map((tc) => tc.pwdId);

        if (pwdIds.length === 0) {
          setLoading(false);
          return;
        }

        // Query shopping list items from all linked PWDs
        shoppingQuery = query(
          collection(db, 'shoppingLists'),
          where('userId', 'in', pwdIds)
        );
      } else {
        // PWD: Get their own shopping list items
        shoppingQuery = query(
          collection(db, 'shoppingLists'),
          where('userId', '==', userId)
        );
      }

      unsubscribeRef.current = onSnapshot(
        shoppingQuery,
        (snapshot) => {
          const shoppingItems: ShoppingItem[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const item = {
              id: doc.id,
              ...data,
              addedAt: data.addedAt?.toDate() || new Date(),
            } as ShoppingItem;
            shoppingItems.push(item);
          });

          // Check if this is a remote update
          const now = Date.now();
          const lastUpdate = lastUpdateRef.current;
          const isRemote = lastUpdate && lastUpdate.userId !== userId && (now - lastUpdate.timestamp) < 5000;

          if (isRemote) {
            setIsRemoteUpdate(true);
            // Trigger voice announcement for significant changes
            const addedItems = shoppingItems.filter(
              (item) => !items.find((existing) => existing.id === item.id)
            );

            if (addedItems.length > 0) {
              if (addedItems.length === 1) {
                triggerVoiceAnnouncement('added to your shopping list', addedItems[0].name);
              } else {
                triggerVoiceAnnouncement('added to your shopping list', '', addedItems.length);
              }
            }

            setTimeout(() => setIsRemoteUpdate(false), 3000);
          }

          setItems(shoppingItems.sort((a, b) =>
            (b.addedAt?.getTime() || 0) - (a.addedAt?.getTime() || 0)
          ));
          setLoading(false);
        },
        (err) => {
          logger.error('REALTIME_SHOPPING', 'Real-time listener error', err);
          setError('Failed to sync shopping list');
          setLoading(false);
        }
      );
    } catch (err) {
      logger.error('REALTIME_SHOPPING', 'Error setting up real-time listener', err);
      setError('Failed to initialize shopping list sync');
      setLoading(false);
    }
  }, [userId, items, triggerVoiceAnnouncement]);

  /**
   * Add new item to shopping list
   */
  const addItem = useCallback(async (item: Partial<ShoppingItem>) => {
    if (!userId) return;

    try {
      lastUpdateRef.current = { userId, timestamp: Date.now() };
      await addDoc(collection(db, 'shoppingLists'), {
        ...item,
        userId,
        isCollected: false,
        addedAt: serverTimestamp(),
        autoGenerated: item.autoGenerated || false,
      });
      logger.info('REALTIME_SHOPPING', `Added item: ${item.name}`);
    } catch (err) {
      setError('Failed to add item');
      throw err;
    }
  }, [userId]);

  /**
   * Update existing item
   */
  const updateItem = useCallback(async (itemId: string, updates: Partial<ShoppingItem>) => {
    if (!userId) return;

    try {
      lastUpdateRef.current = { userId, timestamp: Date.now() };
      const itemRef = doc(db, 'shoppingLists', itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      logger.info('REALTIME_SHOPPING', `Updated item: ${itemId}`);
    } catch (err) {
      setError('Failed to update item');
      throw err;
    }
  }, [userId]);

  /**
   * Toggle item collected status
   */
  const toggleItemStatus = useCallback(async (itemId: string, isCollected: boolean) => {
    if (!userId) return;

    try {
      lastUpdateRef.current = { userId, timestamp: Date.now() };
      const itemRef = doc(db, 'shoppingLists', itemId);
      await updateDoc(itemRef, {
        isCollected,
        collectedAt: isCollected ? serverTimestamp() : null,
      });
      logger.info('REALTIME_SHOPPING', `Toggled item status: ${itemId}`);
    } catch (err) {
      setError('Failed to toggle item status');
      throw err;
    }
  }, [userId]);

  /**
   * Delete item from shopping list
   */
  const deleteItem = useCallback(async (itemId: string) => {
    if (!userId) return;

    try {
      lastUpdateRef.current = { userId, timestamp: Date.now() };
      await deleteDoc(doc(db, 'shoppingLists', itemId));
      logger.info('REALTIME_SHOPPING', `Deleted item: ${itemId}`);
    } catch (err) {
      setError('Failed to delete item');
      throw err;
    }
  }, [userId]);

  /**
   * Clear all collected items
   */
  const clearCollected = useCallback(async () => {
    if (!userId) return;

    try {
      const collectedItems = items.filter((item) => item.isCollected);
      await Promise.all(
        collectedItems.map((item) => deleteDoc(doc(db, 'shoppingLists', item.id)))
      );
      logger.info('REALTIME_SHOPPING', `Cleared ${collectedItems.length} collected items`);
    } catch (err) {
      setError('Failed to clear collected items');
      throw err;
    }
  }, [userId, items]);

  /**
   * Get count of uncollected items
   */
  const getUncollectedCount = useCallback(() => {
    return items.filter((item) => !item.isCollected).length;
  }, [items]);

  /**
   * Refresh shopping list
   */
  const refresh = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    setupRealTimeListener();
  }, [setupRealTimeListener]);

  useEffect(() => {
    setupRealTimeListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setupRealTimeListener]);

  return {
    items,
    loading,
    error,
    isRemoteUpdate,
    addItem,
    updateItem,
    toggleItemStatus,
    deleteItem,
    clearCollected,
    refresh,
    getUncollectedCount,
  };
}