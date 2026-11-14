/**
 * Pantry Management Service (Demo-Proof Edition)
 * Complete inventory management with optimistic updates, offline fallbacks, and fast voice integration.
 */

import { logger } from '@/utils/logger';
import { db } from '@/services/firebase/config';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  nameUr: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  addedDate: number;
  barcode?: string;
  imageUrl?: string;
  price?: number;
  allergies?: string[];
  dietaryTags?: string[];
  avgDailyUsage?: number;
  notes?: string;
}

export interface PantryStats {
  totalItems: number;
  categoriesCount: number;
  expiredItems: number;
  expiringsoon: number;
  lowStockItems: number;
}

export interface ExpiryNotification {
  itemId: string;
  itemName: string;
  itemNameUr: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'expired' | 'warning' | 'info';
  acknowledged: boolean;
  notificationDate: number;
}

class PantryManagementService {
  private readonly MODULE = 'PANTRY_MGMT';
  
  private items: Map<string, PantryItem> = new Map();
  private notifications: ExpiryNotification[] = [];
  private expiryCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize pantry management service
   */
  async initialize(userId: string): Promise<void> {
    try {
      logger.info(this.MODULE, 'Initializing pantry service', { userId });
      await this.loadItems(userId);
      this.startExpiryMonitoring(userId);
      logger.info(this.MODULE, `Loaded ${this.items.size} pantry items`);
    } catch (error) {
      logger.error(this.MODULE, 'Initialization failed', error);
    }
  }

  /**
   * Add item to pantry (Optimistic Update for Instant Voice Feedback)
   */
  async addItem(
    userId: string,
    item: Omit<PantryItem, 'id' | 'userId' | 'addedDate'>,
    isBarcodeScan: boolean = false
  ): Promise<PantryItem> {
    const existing = this.findItemByName(item.name);
    if (existing && isBarcodeScan) {
      return await this.updateQuantity(userId, existing.id, existing.quantity + item.quantity);
    }

    const pantryItem: PantryItem = {
      ...item,
      nameUr: item.nameUr || item.name, 
      id: item.barcode || `item_${Date.now()}`,
      userId,
      addedDate: Date.now(),
    };

    // 1. OPTIMISTIC UPDATE
    this.items.set(pantryItem.id, pantryItem);
    logger.info(this.MODULE, `Added item locally (Optimistic): ${item.name}`);

    // 2. BACKGROUND SYNC (Using Native Firebase SDK)
    try {
      const docRef = doc(db, `users/${userId}/pantry/${pantryItem.id}`);
      await setDoc(docRef, pantryItem);
    } catch (error) {
      logger.warn(this.MODULE, 'Firebase sync failed, item is currently offline-only.', error);
    }

    return pantryItem;
  }

  /**
   * Update item quantity (Optimistic Update)
   */
  async updateQuantity(
    userId: string,
    itemId: string,
    newQuantity: number
  ): Promise<PantryItem> {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Item not found: ${itemId}`);

    // 1. Optimistic Update
    item.quantity = newQuantity;
    this.items.set(itemId, item);

    // 2. Background Sync (Using Native Firebase SDK)
    try {
      const docRef = doc(db, `users/${userId}/pantry/${itemId}`);
      await updateDoc(docRef, { quantity: newQuantity });
    } catch (error) {
      logger.warn(this.MODULE, 'Firebase sync failed for quantity update.', error);
    }

    return item;
  }

  /**
   * Remove item from pantry (Optimistic Update)
   */
  async removeItem(userId: string, itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item) return;

    // 1. Optimistic Update
    this.items.delete(itemId);

    // 2. Background Sync (Using Native Firebase SDK)
    try {
      const docRef = doc(db, `users/${userId}/pantry/${itemId}`);
      await deleteDoc(docRef);
    } catch (error) {
      logger.warn(this.MODULE, 'Firebase sync failed for removal.', error);
    }
  }

  // --- GETTERS ---

  getItems(): PantryItem[] {
    return Array.from(this.items.values());
  }

  getItemsByCategory(category: string): PantryItem[] {
    return Array.from(this.items.values()).filter(
      item => item.category.toLowerCase() === category.toLowerCase()
    );
  }

  getExpiredItems(): PantryItem[] {
    return Array.from(this.items.values()).filter(item => {
      if (!item.expiryDate) return false;
      return new Date() > new Date(item.expiryDate);
    });
  }

  getExpiringItems(daysThreshold: number = 3): PantryItem[] {
    return Array.from(this.items.values()).filter(item => {
      if (!item.expiryDate) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold;
    });
  }

  getLowStockItems(lowThreshold: number = 1): PantryItem[] {
    return Array.from(this.items.values()).filter(item => item.quantity <= lowThreshold);
  }

  getStats(): PantryStats {
    const categories = new Set(Array.from(this.items.values()).map((i: PantryItem) => i.category)).size;
    return {
      totalItems: this.items.size,
      categoriesCount: categories,
      expiredItems: this.getExpiredItems().length,
      expiringsoon: this.getExpiringItems(3).length,
      lowStockItems: this.getLowStockItems().length,
    };
  }

  // --- AUTOMATION & FILTERS ---

  async generateShoppingList(userId: string): Promise<PantryItem[]> {
    try {
      const itemsToReplace = new Map<string, PantryItem>();
      
      [...this.getExpiredItems(), ...this.getExpiringItems(3), ...this.getLowStockItems()]
        .forEach(item => {
          if (!itemsToReplace.has(item.id)) itemsToReplace.set(item.id, item);
        });

      const shoppingList = Array.from(itemsToReplace.values());

      // Fire & forget sync using Native Firebase SDK
      const docRef = doc(db, `users/${userId}/shopping_list_generated`, 'latest');
      setDoc(docRef, {
        items: shoppingList.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit })),
        generatedAt: Date.now(),
        type: 'auto_generated',
      }).catch((e: any) => logger.warn(this.MODULE, 'Failed to sync shopping list', e));

      return shoppingList;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to generate shopping list', error);
      return [];
    }
  }

  filterByDietaryPreferences(userId: string, dietaryPreferences: string[], allergies: string[]): PantryItem[] {
    return Array.from(this.items.values()).filter(item => {
      if (item.allergies && allergies.some(allergy => item.allergies!.includes(allergy))) return false;
      if (dietaryPreferences.length > 0) {
        return item.dietaryTags && dietaryPreferences.some(pref => item.dietaryTags!.includes(pref));
      }
      return true;
    });
  }

  // --- NOTIFICATIONS & VOICE ---

  getNotifications(): ExpiryNotification[] {
    return this.notifications.filter(n => !n.acknowledged);
  }

  acknowledgeNotification(notificationId: string): void {
    const notification = this.notifications.find(n => n.itemId === notificationId);
    if (notification) notification.acknowledged = true;
  }

  getExpirySummaryForVoice(): string {
    const expired = this.getExpiredItems();
    const expiring = this.getExpiringItems(3);

    if (expired.length === 0 && expiring.length === 0) return 'Aapka pantry bilkul fresh hai';

    let summary = '';
    if (expired.length > 0) {
      summary += `${expired.length} item expire ho chuka hai. `;
      if (expired.length <= 2) summary += `Yeh hai: ${expired.map(i => i.nameUr || i.name).join(' aur ')}. `;
    }

    if (expiring.length > 0) {
      summary += `${expiring.length} item jaldi expire hone wale hain. `;
      if (expiring.length <= 2) summary += `In mein se: ${expiring.map(i => i.nameUr || i.name).join(' aur ')}.`;
    }

    return summary;
  }

  // --- PRIVATE UTILS ---

  private findItemByName(name: string): PantryItem | undefined {
    const normalizedName = name.toLowerCase();
    for (const item of this.items.values()) {
      if (item.name.toLowerCase() === normalizedName || (item.nameUr && item.nameUr.toLowerCase() === normalizedName)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Load items from Firestore (With Demo Offline Fallback)
   */
  private async loadItems(userId: string): Promise<void> {
    try {
      // Native Firebase SDK Fetch
      const colRef = collection(db, `users/${userId}/pantry`);
      const snapshot = await getDocs(colRef);
      
      this.items.clear();
      snapshot.forEach(docSnap => {
        this.items.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as PantryItem);
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load items from DB. Loading Demo Mocks.', error);
      
      // 🛠️ DEMO CHEAT CODE: If internet fails, load a mock pantry so the presentation can continue
      this.items.clear();
      const mockItems: PantryItem[] = [
        { id: 'mock_1', userId, name: 'Eggs', nameUr: 'Anday', category: 'Dairy', quantity: 0, unit: 'pieces', addedDate: Date.now() }, 
        { id: 'mock_2', userId, name: 'Milk', nameUr: 'Doodh', category: 'Dairy', quantity: 2, unit: 'Liters', addedDate: Date.now(), expiryDate: new Date(Date.now() + 86400000).toISOString() }, 
        { id: 'mock_3', userId, name: 'Bread', nameUr: 'Bread', category: 'Bakery', quantity: 1, unit: 'pieces', addedDate: Date.now(), expiryDate: new Date(Date.now() - 86400000).toISOString() }
      ];
      mockItems.forEach(i => this.items.set(i.id, i));
    }
  }

  private startExpiryMonitoring(userId: string): void {
    this.expiryCheckInterval = setInterval(() => this.checkExpiries(userId), 1000 * 60 * 60);
  }

  private async checkExpiries(userId: string): Promise<void> {
    const now = Date.now();
    this.getExpiredItems().forEach(item => {
      if (!this.notifications.find(n => n.itemId === item.id && n.severity === 'expired')) {
        this.notifications.push({ itemId: item.id, itemName: item.name, itemNameUr: item.nameUr || item.name, expiryDate: item.expiryDate || '', daysUntilExpiry: -1, severity: 'expired', acknowledged: false, notificationDate: now });
      }
    });

    this.getExpiringItems(3).forEach(item => {
      if (!this.notifications.find(n => n.itemId === item.id && n.severity === 'warning')) {
        const daysUntilExpiry = Math.floor((new Date(item.expiryDate || '').getTime() - now) / (1000 * 60 * 60 * 24));
        this.notifications.push({ itemId: item.id, itemName: item.name, itemNameUr: item.nameUr || item.name, expiryDate: item.expiryDate || '', daysUntilExpiry, severity: 'warning', acknowledged: false, notificationDate: now });
      }
    });
  }

  destroy(): void {
    if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
  }

  async clearAll(): Promise<void> {
    this.items.clear();
    this.notifications = [];
  }
}

export const pantryManagementService = new PantryManagementService();