import { logger } from '@/utils/logger';
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
// Updated to use the new TS HealthGuard
import HealthGuard from '@/services/pantry/HealthGuard';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
import { hapticService } from '@/services/common/haptic.service';
import { PantryCategory } from '@/models/PantryItem';

// Local Fallback Catalog for Pakistani/Demo Products
const MASTER_CATALOG: Record<string, any> = {
  "6291003112345": { name: "Nestle Milkpak 1L", category: PantryCategory.DAIRY, tags: ["dairy", "lactose"] },
  "8961014110012": { name: "Tapal Danedar", category: PantryCategory.BEVERAGES, tags: ["caffeine"] },
  "7622210851234": { name: "Lays Masala", category: PantryCategory.SNACKS, tags: ["gluten", "spicy", "preservatives"] },
  "8964000180219": { name: "National Ketchup", category: PantryCategory.CONDIMENTS, tags: ["sugar", "preservatives"] }
};

export interface BarcodeResult {
  barcode: string;
  success: boolean;
  productName?: string;
  isSafe?: boolean;
}

class BarcodeService {
  private readonly MODULE = 'BARCODE_SERVICE';
  private barcodeCache: Map<string, any> = new Map();

  /**
   * Main pipeline: Looks up barcode, runs HealthGuard (Groq AI), and saves to Pantry.
   */
  async processScannedBarcode(barcodeValue: string): Promise<BarcodeResult> {
    logger.info(this.MODULE, `Processing scan: ${barcodeValue}`);
    
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        await TtsService.speak("Aap logged in nahi hain.");
        return { barcode: barcodeValue, success: false };
      }

      // 1. Product Lookup (Cache -> API/Database -> Fallback Catalog)
      let product = this.barcodeCache.get(barcodeValue) || await this.lookupProduct(barcodeValue);

      if (!product) {
        await hapticService.trigger('error');
        await TtsService.speak("Maazrat, yeh item mere database mein nahi hai.");
        return { barcode: barcodeValue, success: false };
      }

      // 2. Health Guard Safety Check (Now powered by Groq LLM via HealthGuard.ts)
      const safetyCheck = await HealthGuard.validateSafety(user.uid, { 
        product_name: product.name, 
        allergy_tags: product.tags 
      });

      // 3. Save/Update in Firestore
      // Check if item already exists to increment, otherwise add new
      const existingItems = await PantryService.getPantryItems(user.uid);
      const existingItem = existingItems.find(i => i.name === product.name);

      let newQty = 1;
      if (existingItem) {
        newQty = existingItem.quantity + 1;
        await PantryService.updatePantryItem(user.uid, existingItem.id, { quantity: newQty });
      } else {
        await PantryService.addPantryItem(user.uid, {
          name: product.name,
          category: product.category || PantryCategory.OTHER,
          quantity: 1,
          unit: 'pieces',
          allergies: product.tags, // Keep tags for future reference
          lowStockThreshold: 1,
          expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Default 14 days
        });
      }

      // 4. Final Voice Feedback and Haptics
      if (!safetyCheck.isSafe) {
        await hapticService.trigger('heavy');
        // AI HealthGuard provides specific warnings like "Ahtiyat, ismein dairy hai."
        await TtsService.speak(`${safetyCheck.message} Phir bhi, ${product.name} pantry mein add kar diya gaya hai.`);
      } else {
        await hapticService.trigger('success');
        await TtsService.speak(`${product.name} pantry mein shamil ho gaya. Ab aap ke paas ${newQty} hain.`);
      }

      return { 
        barcode: barcodeValue, 
        success: true, 
        productName: product.name,
        isSafe: safetyCheck.isSafe 
      };

    } catch (error) {
      logger.error(this.MODULE, 'Pipeline failed', error);
      await TtsService.speak("Scan process mein error aaya hai.");
      return { barcode: barcodeValue, success: false };
    }
  }

  /**
   * Simulates an API/Database lookup. Falls back to local catalog.
   */
  private async lookupProduct(barcode: string): Promise<any | null> {
    // In production, you would call OpenFoodFacts API here
    
    // For FYP Demo, we rely on the local master catalog
    const product = MASTER_CATALOG[barcode];
    
    if (product) {
      this.barcodeCache.set(barcode, product);
      return product;
    }
    
    return null;
  }

  /**
   * Utility to clear memory
   */
  clearCache(): void {
    this.barcodeCache.clear();
    logger.info(this.MODULE, 'Barcode cache cleared');
  }
}

export const barcodeService = new BarcodeService();