import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { PantryItem, PantryCategory } from '@/models/PantryItem';
import { logger } from '@/utils/logger';
import { hapticService } from '@/services/common/haptic.service';
import { APP_CONFIG } from '@/constants/config';
import { UsageLearner } from './UsageLearner';

class PantryServiceImpl {
  private readonly MODULE = 'PANTRY_SERVICE';
  private readonly COLLECTION = 'pantry';

  // 🛠️ FIX 1: Local Cache. Instantly loads data, no hanging spinners!
  private cachedItems: PantryItem[] | null = null;

  // ==========================================
  // CORE CRUD OPERATIONS
  // ==========================================

  async getPantryItems(userId: string): Promise<PantryItem[]> {
    const fetchFromFirebase = async (): Promise<PantryItem[]> => {
      try {
        const pantryRef = collection(db, this.COLLECTION);
        const q = query(pantryRef, where('userId', '==', userId));
        
        // 🛠️ FIX 2: Strict 3-second timeout. If Firebase hangs, we abort and use Cache/Demo!
        const querySnapshot = await Promise.race([
          getDocs(q),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Network Timeout')), 3000))
        ]) as any;
        
        const items: PantryItem[] = [];
        querySnapshot.forEach((docSnap: any) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as PantryItem);
        });
        
        // Sort by newest first and update cache
        this.cachedItems = items.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
        return this.cachedItems;
      } catch (error) {
        logger.warn(this.MODULE, 'Firebase sync failed or timed out. Falling back to offline data.', error);
        
        if (!this.cachedItems || this.cachedItems.length === 0) {
          this.cachedItems = this.getDemoData(userId);
        }
        return this.cachedItems;
      }
    };

    // If we already have a cache, return it instantly to kill the UI spinner, then sync silently.
    if (this.cachedItems) {
      fetchFromFirebase(); // Fire and forget background sync
      return this.cachedItems;
    }

    // First time load
    return await fetchFromFirebase();
  }

  // Alias for backwards compatibility
  async getAllItems(userId: string): Promise<PantryItem[]> {
    return this.getPantryItems(userId);
  }

  async getPantryItem(userId: string, itemId: string): Promise<PantryItem | null> {
    // Check cache first for instant response
    if (this.cachedItems) {
      const found = this.cachedItems.find(i => i.id === itemId);
      if (found) return found;
    }

    try {
      const itemRef = doc(db, this.COLLECTION, itemId);
      const itemSnap = await Promise.race([
        getDoc(itemRef),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]) as any;
      
      if (itemSnap.exists() && itemSnap.data().userId === userId) {
        return { id: itemSnap.id, ...itemSnap.data() } as PantryItem;
      }
      return null;
    } catch (error) {
      logger.error(this.MODULE, `Failed to fetch item ${itemId}`, error);
      return null;
    }
  }

  async addPantryItem(userId: string, itemData: Partial<PantryItem>): Promise<string | null> {
    try {
      const pantryRef = collection(db, this.COLLECTION);
      const raw = {
        ...itemData,
        userId,
        addedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lowStockThreshold: itemData.lowStockThreshold || APP_CONFIG.LOW_STOCK_THRESHOLD || 1,
      };

      // Firestore rejects `undefined` values — replace with null or remove the key
      const newItem = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v === undefined ? null : v])
      );

      // 🛠️ Optimistic Cache Update
      const tempId = `temp_${Date.now()}`;
      if (this.cachedItems) {
        this.cachedItems.unshift({ id: tempId, ...newItem } as PantryItem);
      }

      const docRef = await addDoc(pantryRef, newItem);

      // Correct the ID in cache once Firebase responds
      if (this.cachedItems) {
        const item = this.cachedItems.find(i => i.id === tempId);
        if (item) item.id = docRef.id;
      }

      logger.info(this.MODULE, `Added new item: ${newItem['name']} (ID: ${docRef.id})`);
      return docRef.id;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to add pantry item', error);
      return `temp_id_${Date.now()}`;
    }
  }

  async updatePantryItem(userId: string, itemId: string, updates: Partial<PantryItem> | any): Promise<void> {
    try {
      // 🛠️ Optimistic Cache Update
      if (this.cachedItems) {
        const index = this.cachedItems.findIndex(i => i.id === itemId);
        if (index > -1) {
          this.cachedItems[index] = { ...this.cachedItems[index], ...updates, lastUpdated: new Date().toISOString() };
        }
      }

      const itemRef = doc(db, this.COLLECTION, itemId);
      await updateDoc(itemRef, {
        ...updates,
        lastUpdated: new Date().toISOString()
      });
      logger.info(this.MODULE, `Updated item ${itemId}`);
    } catch (error) {
      logger.error(this.MODULE, `Failed to update item ${itemId} (Offline mode active)`, error);
    }
  }

  async deletePantryItem(userId: string, itemId: string): Promise<void> {
    try {
      // 🛠️ Optimistic Cache Update
      if (this.cachedItems) {
        this.cachedItems = this.cachedItems.filter(i => i.id !== itemId);
      }

      const itemRef = doc(db, this.COLLECTION, itemId);
      await deleteDoc(itemRef);
      logger.info(this.MODULE, `Deleted item ${itemId}`);
    } catch (error) {
      logger.error(this.MODULE, `Failed to delete item ${itemId} (Offline mode active)`, error);
    }
  }

  // ==========================================
  // EXTENDED LOGIC (Search & Scanner integration)
  // ==========================================

  async searchItems(userId: string, searchTerm: string): Promise<PantryItem[]> {
    const allItems = await this.getPantryItems(userId);
    const lowerSearch = searchTerm.toLowerCase();
    return allItems.filter(item => item.name.toLowerCase().includes(lowerSearch));
  }

  async handleScanResult(userId: string, barcode: string, productDetails: any): Promise<void> {
    try {
      const allItems = await this.getPantryItems(userId);
      const existingItem = allItems.find(i => i.barcode === barcode || i.name === productDetails.name);

      if (existingItem) {
        const newQty = (existingItem.quantity || 0) + 1;
        const daysSinceLastUpdate = Math.floor((new Date().getTime() - new Date(existingItem.lastUpdated || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const currentLearnedRate = (existingItem as any).behavioral_metrics?.learned_rate || 0.1;
        
        const updatedRate = UsageLearner.learnNewRate(currentLearnedRate, 1, daysSinceLastUpdate);
        
        await this.updatePantryItem(userId, existingItem.id, {
          quantity: newQty,
          'behavioral_metrics.learned_rate': updatedRate,
          lastRestock: new Date().toISOString()
        });
        logger.info(this.MODULE, `Updated ${productDetails.name}. New Qty: ${newQty}`);
      } else {
        await this.addPantryItem(userId, {
          name: productDetails.name,
          category: productDetails.category || PantryCategory.OTHER,
          quantity: 1,
          unit: productDetails.unit || 'pieces',
          barcode: barcode,
          imageUrl: productDetails.imageUrl,
          allergies: productDetails.allergy_tags || [] 
        });
      }
      await hapticService.trigger('success');
    } catch (error) {
      logger.error(this.MODULE, 'Error handling scan in pantry', error);
      await hapticService.trigger('error');
    }
  }

  // ==========================================
  // DEMO DATA GENERATOR
  // ==========================================
  private getDemoData(userId: string): PantryItem[] {
    return [
      { id: 'mock_1', userId, name: 'Eggs', category: PantryCategory.DAIRY, quantity: 0, unit: 'pieces', addedDate: new Date().toISOString(), lowStockThreshold: 1 },
      { id: 'mock_2', userId, name: 'Milk', category: PantryCategory.DAIRY, quantity: 2, unit: 'Liters', addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 86400000).toISOString(), lowStockThreshold: 1 }, 
      { id: 'mock_3', userId, name: 'Bread', category: PantryCategory.BAKERY, quantity: 1, unit: 'pieces', addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() - 86400000).toISOString(), lowStockThreshold: 1 }  
    ] as unknown as PantryItem[];
  }
}

// Export as a singleton instance
export const PantryService = new PantryServiceImpl();