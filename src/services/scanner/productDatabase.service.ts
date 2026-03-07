import { db } from '@/src/services/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { PantryItem } from '@/src/models/PantryItem';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Product Database Service
 * Manages local product lookups and bridges Barcode data to Pantry models.
 */
class ProductDatabaseService {
  private readonly MODULE = 'PRODUCT_DATABASE';
  private readonly COLLECTION = 'product_catalog';

  /**
   * Looks up a product by Barcode (EAN/UPC)
   */
  async findByBarcode(barcode: string): Promise<Partial<PantryItem> | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION), 
        where('barcode', '==', barcode),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        logger.info(this.MODULE, `Barcode ${barcode} not found in local DB.`);
        return null;
      }

      const data = snapshot.docs[0].data();
      return {
        name: data.name,
        category: data.category,
        unit: data.unit || 'pcs',
        // Localized description for PWD accessibility
        description: data.description_ur ? `${data.name}. ${data.description_ur}` : data.description,
      };
    } catch (error) {
      logger.error(this.MODULE, 'Database lookup failed', error);
      return null;
    }
  }

  /**
   * Mock data for local brands (Olpers, Tapal, etc.) to show during defense
   */
  getLocalProductSuggestion(name: string): Partial<PantryItem> | null {
    const localDb: Record<string, Partial<PantryItem>> = {
      'olpers': { name: 'Olpers Milk', category: 'Dairy', unit: 'Liter' },
      'tapal': { name: 'Tapal Danedar Tea', category: 'Grains', unit: 'Pack' },
      'nestle': { name: 'Nestle Pure Life', category: 'Beverages', unit: 'Bottle' },
    };

    const key = name.toLowerCase();
    return localDb[key] || null;
  }
}

export const productDatabaseService = new ProductDatabaseService();
