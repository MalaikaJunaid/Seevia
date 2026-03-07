import { orderBy, where, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { APP_CONFIG } from '@/src/constants/config';
import { PantryItem, PantryItemInput } from '@/src/models/PantryItem';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import hapticService from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

// Note: These would be your AI utility imports
// import UsageLearner from './UsageLearner'; 
// import ProactiveBrain from './ProactiveBrain';

/**
 * Seevia Pantry Service
 * Orchestrates inventory management, AI usage prediction, and cloud synchronization.
 */
export class PantryService {
  private static readonly MODULE = 'PANTRY_SERVICE';
  private static readonly COLLECTION = 'pantryItems';

  /**
   * Processes a new scan and either updates or creates a pantry item.
   * Merged from PantryManager.js logic.
   */
  static async handleScanResult(userId: string, barcode: string, productDetails: any): Promise<void> {
    try {
      const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION);
      const itemRef = doc(FirestoreService.getDb(), collectionPath, barcode);
      const snap = await getDoc(itemRef);

      if (snap.exists()) {
        // 1. UPDATE EXISTING ITEM with Usage Prediction
        const data = snap.data() as PantryItem;
        const newQty = (data.quantity || 0) + 1;

        // AI Logic: Prediction of stock exhaustion
        // const updatedRate = UsageLearner.trainRate(data.avgDailyUsage || 0.1, data.lastRestock, 1);
        // const prediction = ProactiveBrain.calculateStockout(newQty, updatedRate);

        await updateDoc(itemRef, {
          quantity: newQty,
          lastRestock: serverTimestamp(),
          // predictedEmpty: prediction.date
        });
        logger.info(this.MODULE, `Updated ${productDetails.name}. New Qty: ${newQty}`);
      } else {
        // 2. CREATE NEW ITEM
        const newItem: PantryItemInput = {
          name: productDetails.name,
          category: productDetails.category || 'Grocery',
          quantity: 1,
          unit: productDetails.unit || 'unit',
          barcode: barcode,
          imageUrl: productDetails.imageUrl,
        };
        await this.addItem(userId, newItem);
      }
      await hapticService.success();
    } catch (error) {
      logger.error(this.MODULE, 'Error handling scan in pantry', error);
      await hapticService.error();
    }
  }

  /**
   * Add a new item to pantry with structured metadata.
   */
  static async addItem(userId: string, item: PantryItemInput): Promise<PantryItem> {
    const itemId = item.barcode || `${Date.now()}`;
    const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION);

    const pantryItem: PantryItem = {
      id: itemId,
      userId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate || null,
      addedDate: new Date(),
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      lowStockThreshold: item.lowStockThreshold || APP_CONFIG.LOW_STOCK_THRESHOLD,
    };

    await FirestoreService.setDocument(collectionPath, itemId, pantryItem);
    return pantryItem;
  }

  /**
   * Get all items for the user, ordered by most recently added.
   */
  static async getAllItems(userId: string): Promise<PantryItem[]> {
    const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION);
    return await FirestoreService.queryDocuments<PantryItem>(
      collectionPath,
      [orderBy('addedDate', 'desc')]
    );
  }

  /**
   * Search within the user's pantry.
   */
  static async searchItems(userId: string, searchTerm: string): Promise<PantryItem[]> {
    const allItems = await this.getAllItems(userId);
    const lowerSearch = searchTerm.toLowerCase();
    return allItems.filter(item => item.name.toLowerCase().includes(lowerSearch));
  }
}
