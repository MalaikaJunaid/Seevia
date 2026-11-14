import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { PantryItem, PantryCategory } from '@/models/PantryItem'; // 🛠️ Imported PantryCategory
import { AuthService } from '@/services/firebase/auth.service';
import { logger } from '@/utils/logger';
import { getExpiryStatus } from '@/utils/expiry';

interface UseRealTimePantryReturn {
  items: PantryItem[];
  loading: boolean;
  error: Error | null;
  
  // Pre-calculated stats for the UI
  expiredItems: PantryItem[];
  expiringSoonItems: PantryItem[];
  lowStockItems: PantryItem[];
  
  // Helper to force a retry if auth is delayed
  reload: () => void;
}

/**
 * Seevia Real-Time Pantry Hook
 * Listens to the user's pantry collection in Firestore and updates the UI instantly.
 */
export function useRealTimePantry(): UseRealTimePantryReturn {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    
    if (!user) {
      logger.warn('USE_REALTIME_PANTRY', 'No user found. Waiting for auth...');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Creates a query to the user's specific pantry subcollection
    const pantryRef = collection(db, `users/${user.uid}/pantry`);
    const q = query(pantryRef);

    // 📡 PRIMARY SYSTEM: Real-time WebSocket connection to Firebase
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: PantryItem[] = [];
        snapshot.forEach((docSnap) => {
          fetchedItems.push({ id: docSnap.id, ...docSnap.data() } as PantryItem);
        });

        // Sort by newest added
        fetchedItems.sort((a, b) => {
          const dateA = new Date(a.addedDate).getTime();
          const dateB = new Date(b.addedDate).getTime();
          return dateB - dateA; // Descending
        });

        setItems(fetchedItems); // 👈 This syncs your REAL data to the UI
        setLoading(false);
      },
      (err) => {
        logger.error('USE_REALTIME_PANTRY', 'Firestore snapshot failed. Network issue?', err);
        setError(err);
        setLoading(false);
        
        // 🛟 FALLBACK SYSTEM (Demo Cheat Code): Only runs if Firebase completely fails
        setItems([
          { 
            id: 'mock_1', userId: user.uid, name: 'Eggs', nameUr: 'Anday', category: PantryCategory.DAIRY, quantity: 0, unit: 'pieces', 
            addedDate: new Date().toISOString(), 
            lowStockThreshold: 1,
            expiryDate: null // 🛠️ FIXED: Explicitly set to null to satisfy the model's required property
          },
          { 
            id: 'mock_2', userId: user.uid, name: 'Milk', nameUr: 'Doodh', category: PantryCategory.DAIRY, quantity: 2, unit: 'Liters', 
            addedDate: new Date().toISOString(), 
            expiryDate: new Date(Date.now() + 86400000).toISOString(), lowStockThreshold: 1 
          },
          { 
            id: 'mock_3', userId: user.uid, name: 'Bread', nameUr: 'Bread', category: PantryCategory.BAKERY, quantity: 1, unit: 'pieces', 
            addedDate: new Date().toISOString(), 
            expiryDate: new Date(Date.now() - 86400000).toISOString(), lowStockThreshold: 1 
          }
        ]);
      }
    );

    // Cleanup function: detaches the listener when the component unmounts
    return () => unsubscribe();
  }, [retryTrigger]); // Re-run if reload() is called

  // ==========================================
  // MEMOIZED COMPUTATIONS (Fast UI Rendering)
  // ==========================================

  const expiredItems = useMemo(() => {
    return items.filter(item => getExpiryStatus(item.expiryDate || undefined).status === 'expired');
  }, [items]);

  const expiringSoonItems = useMemo(() => {
    return items.filter(item => getExpiryStatus(item.expiryDate || undefined).status === 'warning');
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.quantity <= (item.lowStockThreshold || 1));
  }, [items]);

  return {
    items,
    loading,
    error,
    expiredItems,
    expiringSoonItems,
    lowStockItems,
    reload: () => setRetryTrigger(prev => prev + 1)
  };
}