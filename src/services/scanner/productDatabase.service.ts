import { db } from '@/services/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { PantryItem } from '@/services/pantry/pantry-management.service';
import { logger } from '@/utils/logger';

export enum PantryCategory {
  // Fresh & Perishables
  DAIRY = 'Dairy',
  FRUITS = 'Fruits', 
  VEGETABLES = 'Vegetables',
  MEAT = 'Meat & Seafood',
  BAKERY = 'Bakery',

  // Staples & Pantry
  GRAINS = 'Grains & Cereals',
  DAAL_PULSES = 'Daal & Pulses', // Essential for Pakistani/UAE households
  OILS_FATS = 'Oils & Fats',     // Cooking oil, ghee, butter
  SPICES = 'Spices',
  CONDIMENTS = 'Condiments',
  CANNED_GOODS = 'Canned Goods',

  // Snacks & Beverages
  BEVERAGES = 'Beverages',
  SNACKS = 'Snacks',
  FROZEN = 'Frozen Foods',

  // Health & Home
  MEDICINE = 'Medicine', // Crucial for FE5 health tracking
  HOUSEHOLD = 'Household', // Detergents, soaps, cleaning supplies
  PERSONAL_CARE = 'Personal Care', // Shampoo, toothpaste
  
  OTHER = 'Other',
}

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
        notes: data.description_ur ? `${data.name}. ${data.description_ur}` : data.notes,
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
      'olpers': { name: 'Olpers Milk', category: ProductCategory.DAIRY, unit: 'liters' },
      'tapal': { name: 'Tapal Danedar Tea', category: ProductCategory.GRAINS, unit: 'packets' },
      'nestle': { name: 'Nestle Pure Life', category: ProductCategory.BEVERAGES, unit: 'bottles' },
    };

    const key = name.toLowerCase();
    return localDb[key] || null;
  }
}

export const productDatabaseService = new ProductDatabaseService();
