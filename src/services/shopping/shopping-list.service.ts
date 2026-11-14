/**
 * Shopping List Service (Enhanced)
 * Manages shopping cart, lists, and purchase history
 * 
 * Features:
 * - Multiple shopping lists
 * - Item quantity management
 * - Price calculation
 * - Purchase history tracking
 * - Firebase sync for multi-device support
 */

import { FirestoreService } from '../firebase/firestore.service';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from './product-database.service';

export interface ShoppingListItem {
  productId: string;
  product: Product;
  quantity: number;
  addedAt: number;
  price?: number; // Price at time of adding
}

export interface ShoppingList {
  id: string;
  name: string;
  nameUr: string;
  items: ShoppingListItem[];
  createdAt: number;
  updatedAt: number;
  totalPrice: number;
  itemCount: number;
  isActive: boolean;
}

export interface PurchaseHistory {
  id: string;
  listId: string;
  items: ShoppingListItem[];
  totalPrice: number;
  purchasedAt: number;
  storeName?: string;
  storeId?: string;
}

class ShoppingListService {
  private readonly MODULE = 'SHOPPING_LIST';
  private firestoreService = new FirestoreService();
  private lists: Map<string, ShoppingList> = new Map();
  private activeListId: string | null = null;

  /**
   * Initialize shopping list service
   */
  async initialize(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Initializing shopping list service');
      await this.loadListsFromStorage();
      logger.info(this.MODULE, `Loaded ${this.lists.size} shopping lists`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to initialize', error);
    }
  }

  /**
   * Create new shopping list
   */
  async createList(name: string, nameUr: string): Promise<ShoppingList> {
    try {
      const id = `list_${Date.now()}`;
      const list: ShoppingList = {
        id,
        name,
        nameUr,
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalPrice: 0,
        itemCount: 0,
        isActive: true,
      };

      this.lists.set(id, list);
      if (!this.activeListId) {
        this.activeListId = id;
      }

      await this.saveToStorage();
      logger.info(this.MODULE, `Created list: ${name}`);
      
      return list;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to create list', error);
      throw error;
    }
  }

  /**
   * Add item to shopping list
   * Increments quantity if item already exists
   */
  async addItem(
    listId: string | null,
    product: Product,
    quantity: number = 1
  ): Promise<ShoppingListItem> {
    try {
      const targetListId = listId || this.activeListId;
      if (!targetListId) {
        throw new Error('No active shopping list');
      }

      const list = this.lists.get(targetListId);
      if (!list) {
        throw new Error(`List not found: ${targetListId}`);
      }

      // Check if item already exists
      const existingItem = list.items.find(i => i.productId === product.id);
      if (existingItem) {
        existingItem.quantity += quantity;
        logger.info(this.MODULE, `Incremented ${product.nameEn} to ${existingItem.quantity}`);
      } else {
        const newItem: ShoppingListItem = {
          productId: product.id,
          product,
          quantity,
          addedAt: Date.now(),
          price: product.price,
        };
        list.items.push(newItem);
        logger.info(this.MODULE, `Added ${product.nameEn} to list`);
      }

      // Update totals
      this.updateListTotals(list);
      await this.saveToStorage();

      return existingItem || list.items[list.items.length - 1];
    } catch (error) {
      logger.error(this.MODULE, 'Failed to add item', error);
      throw error;
    }
  }

  /**
   * Remove item from shopping list
   */
  async removeItem(listId: string, productId: string): Promise<void> {
    try {
      const list = this.lists.get(listId);
      if (!list) throw new Error(`List not found: ${listId}`);

      list.items = list.items.filter(i => i.productId !== productId);
      this.updateListTotals(list);
      await this.saveToStorage();

      logger.info(this.MODULE, `Removed product from list: ${productId}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to remove item', error);
      throw error;
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    listId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    try {
      const list = this.lists.get(listId);
      if (!list) throw new Error(`List not found: ${listId}`);

      const item = list.items.find(i => i.productId === productId);
      if (!item) throw new Error(`Item not found: ${productId}`);

      if (quantity <= 0) {
        await this.removeItem(listId, productId);
      } else {
        item.quantity = quantity;
        this.updateListTotals(list);
        await this.saveToStorage();
      }

      logger.info(this.MODULE, `Updated quantity to ${quantity}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to update quantity', error);
      throw error;
    }
  }

  /**
   * Get active shopping list
   */
  getActiveList(): ShoppingList | null {
    if (!this.activeListId) return null;
    return this.lists.get(this.activeListId) || null;
  }

  /**
   * Get all shopping lists
   */
  getAllLists(): ShoppingList[] {
    return Array.from(this.lists.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }

  /**
   * Set active shopping list
   */
  setActiveList(listId: string): void {
    if (!this.lists.has(listId)) {
      throw new Error(`List not found: ${listId}`);
    }
    this.activeListId = listId;
    logger.info(this.MODULE, `Active list changed to: ${listId}`);
  }

  /**
   * Clear shopping list (remove all items)
   */
  async clearList(listId: string): Promise<void> {
    try {
      const list = this.lists.get(listId);
      if (!list) throw new Error(`List not found: ${listId}`);

      list.items = [];
      this.updateListTotals(list);
      await this.saveToStorage();

      logger.info(this.MODULE, `Cleared list: ${listId}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to clear list', error);
      throw error;
    }
  }

  /**
   * Archive list (mark as inactive)
   */
  async archiveList(listId: string): Promise<void> {
    try {
      const list = this.lists.get(listId);
      if (!list) throw new Error(`List not found: ${listId}`);

      list.isActive = false;
      await this.saveToStorage();

      if (this.activeListId === listId) {
        // Switch to another active list or create new one
        const activeList = Array.from(this.lists.values()).find(l => l.isActive);
        this.activeListId = activeList?.id || null;
      }

      logger.info(this.MODULE, `Archived list: ${listId}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to archive list', error);
      throw error;
    }
  }

  /**
   * Complete purchase and save to history
   */
  async completePurchase(
    listId: string,
    storeName?: string,
    storeId?: string
  ): Promise<PurchaseHistory> {
    try {
      const list = this.lists.get(listId);
      if (!list) throw new Error(`List not found: ${listId}`);

      const purchase: PurchaseHistory = {
        id: `purchase_${Date.now()}`,
        listId,
        items: JSON.parse(JSON.stringify(list.items)),
        totalPrice: list.totalPrice,
        purchasedAt: Date.now(),
        storeName,
        storeId,
      };

      // Save to Firebase
      await this.firestoreService.setDocument(
        `purchase_history/${purchase.id}`,
        purchase
      );

      // Archive the list
      await this.archiveList(listId);

      logger.info(this.MODULE, `Purchase completed: ${purchase.id}`);
      return purchase;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to complete purchase', error);
      throw error;
    }
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(limit: number = 10): Promise<PurchaseHistory[]> {
    try {
      const history = await this.firestoreService.query(
        'purchase_history',
        []
      );

      return history
        .map(h => ({
          ...h,
          purchasedAt: h.purchasedAt?.toMillis?.() || h.purchasedAt,
        }))
        .sort((a, b) => b.purchasedAt - a.purchasedAt)
        .slice(0, limit);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get purchase history', error);
      return [];
    }
  }

  /**
   * Get list statistics for analytics
   */
  getListStats(): {
    totalLists: number;
    activeLists: number;
    totalItems: number;
    averagePrice: number;
  } {
    const allLists = Array.from(this.lists.values());
    const activeLists = allLists.filter(l => l.isActive);
    const totalItems = allLists.reduce((sum, l) => sum + l.itemCount, 0);
    const totalPrice = allLists.reduce((sum, l) => sum + l.totalPrice, 0);

    return {
      totalLists: allLists.length,
      activeLists: activeLists.length,
      totalItems,
      averagePrice: activeLists.length > 0 ? totalPrice / activeLists.length : 0,
    };
  }

  /**
   * Private helper: Update list totals
   */
  private updateListTotals(list: ShoppingList): void {
    list.itemCount = list.items.length;
    list.totalPrice = list.items.reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity);
    }, 0);
    list.updatedAt = Date.now();
  }

  /**
   * Private helper: Save to local storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        lists: Array.from(this.lists.entries()),
        activeListId: this.activeListId,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('shopping_lists', JSON.stringify(data));
    } catch (error) {
      logger.error(this.MODULE, 'Failed to save to storage', error);
    }
  }

  /**
   * Private helper: Load from local storage
   */
  private async loadListsFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('shopping_lists');
      if (data) {
        const parsed = JSON.parse(data);
        this.lists = new Map(parsed.lists);
        this.activeListId = parsed.activeListId;
        logger.info(this.MODULE, `Loaded ${this.lists.size} lists from storage`);
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load from storage', error);
    }
  }

  /**
   * Clear all data (for testing or manual reset)
   */
  async clearAll(): Promise<void> {
    try {
      this.lists.clear();
      this.activeListId = null;
      await AsyncStorage.removeItem('shopping_lists');
      logger.info(this.MODULE, 'All data cleared');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to clear all', error);
    }
  }
}

// Export singleton instance
export const shoppingListService = new ShoppingListService();
