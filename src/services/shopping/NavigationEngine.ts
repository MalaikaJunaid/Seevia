import { logger } from '@/utils/logger';
import storeMapJson from '../../assets/data/save_mart_pwd_map.json';

// --- Type Definitions ---
export interface StoreItem {
  en: string;
  ur: string;
}

export interface AisleData {
  coordinates?: any; // e.g., { x: number, y: number } depending on your JSON
  items: StoreItem[];
}

export interface StoreMap {
  store_name?: string;
  aisle_data: Record<string, AisleData>;
}

export interface NavigationResult {
  aisleId: string;
  location: any;
  items: StoreItem[];
}

// Ensure strict typing over the imported JSON
const storeMap = storeMapJson as unknown as StoreMap;

export default class NavigationEngine {
  private static readonly MODULE = 'NAVIGATION_ENGINE';

  /**
   * Finds the aisle for a specific product using the local store map.
   * @param productName - e.g., "Milk" or "Tea"
   */
  static findProduct(productName: string): NavigationResult | null {
    if (!productName || typeof productName !== 'string') {
      return null;
    }

    try {
      const aisles = storeMap.aisle_data;
      if (!aisles) return null;

      const searchStr = productName.toLowerCase().trim();
      
      for (const [aisleId, data] of Object.entries(aisles)) {
        // Defensive check in case JSON structure is slightly off
        if (!data || !data.items || !Array.isArray(data.items)) continue;

        const found = data.items.find((item: StoreItem) => {
          // 🛠️ FIX: Safe lowercase checks for both English and Roman Urdu
          const matchEn = item.en ? item.en.toLowerCase().includes(searchStr) : false;
          const matchUr = item.ur ? item.ur.toLowerCase().includes(searchStr) : false;
          
          return matchEn || matchUr;
        });
        
        if (found) {
          logger.info(this.MODULE, `Found ${productName} in ${aisleId}`);
          return { 
            aisleId, 
            location: data.coordinates, 
            items: data.items 
          };
        }
      }
      
      return null; // Not found in local map
    } catch (error: any) { // 🛠️ FIX: Strict Mode error typing
      logger.error(this.MODULE, 'Error searching store map', error);
      return null;
    }
  }
}