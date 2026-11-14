/**
 * Seevia Pantry Module - Service Exports
 * Module 3: Pantry Management
 * 
 * Provides complete inventory management with:
 * - Barcode scanning & product detection
 * - Expiry date tracking with 3-day notifications
 * - Dietary preference filtering
 * - Shopping list auto-generation
 * - Voice-enabled item management
 */

// 1. Pantry Management Engine
export { pantryManagementService } from './pantry-management.service';
export type {
  PantryStats,
  ExpiryNotification,
} from './pantry-management.service';

// 2. Core Data Models (🛠️ FIXED: Sourced from the correct models folder)
export type {
  PantryItem,
  PantryItemInput,
  PantryCategory,
} from '@/models/PantryItem';

// 3. Barcode & Scanning
export { barcodeService } from './barcode.service';
// Note: If you need BarcodeResult, make sure it is explicitly exported in barcode.service.ts
// export type { BarcodeResult } from './barcode.service';

// 4. Dietary & Safety
export { dietaryPreferencesService } from './dietary-preferences.service';

// 5. Auxiliary & Legacy Services
export { PantryService } from './pantry.service';
export { expiryService } from './expiry.service'; // 🛠️ FIXED: Lowercase instance
export { ShoppingListService } from './shoppingList.service';