/**
 * BarcodeService.js: The link between scanning and inventory.
 * Handles item identification and stock incrementing.
 */

import PantryManager from './PantryManager';
import HealthGuard from './HealthGuard';
import TtsService from '../voice/TtsService';

// Master Catalog: In a real app, this would be a larger DB or OpenFoodFacts API
const MASTER_CATALOG = {
  "6291003112345": { name: "Nestle Milkpak 1L", tags: ["dairy", "lactose"] },
  "8961014110012": { name: "Tapal Danedar 450g", tags: ["caffeine"] },
  "7622210851234": { name: "Lays Masala", tags: ["gluten", "spicy"] }
};

export default class BarcodeService {
  /**
   * Processes a scanned barcode and adds it to the digital pantry.
   * @param {string} barcodeData - The raw string from the scanner.
   * @param {Object} userProfile - For HealthGuard cross-referencing.
   */
  static async processScan(barcodeData, userProfile) {
    const product = MASTER_CATALOG[barcodeData];

    if (!product) {
      TtsService.speak("Maazrat, yeh item mere database mein nahi hai.");
      return;
    }

    // 1. Health Safety Check (Module 3 Core)
    const safetyCheck = HealthGuard.validateSafety(
      { product_name: product.name, allergy_tags: product.tags },
      userProfile
    );

    if (!safetyCheck.isSafe) {
      TtsService.speak(safetyCheck.message);
      // We still add it, but the user is warned.
    }

    // 2. Update Stock in Firebase
    const newQty = await PantryManager.updateStock(barcodeData, 1);
    
    TtsService.speak(`${product.name} pantry mein shamil kar diya gaya hai. Ab aapke pass ${newQty} packets hain.`);
    
    return { product, newQty };
  }
}
