/**
 * Shopping Module Exports
 * Central export point for all shopping services
 */

export { visionControllerService, type DetectionResult, type DetectionConfig } from './vision-controller.service';
export { productDatabaseService, type Product, type ProductSearchResult } from './product-database.service';
export { shoppingListService, type ShoppingList, type ShoppingListItem, type PurchaseHistory } from './shopping-list.service';
export { storeLayoutService, type Store, type Aisle, type NavigationPath, type NavigationInstruction } from './store-layout.service';

// Legacy exports (for backward compatibility)
export { default as YoloService } from './YoloService';
export { default as OCRService } from './OCRService';
export { default as GeminiService } from './GeminiService';
export { default as ProductMatcher } from './ProductMatcher';
export { default as NavigationEngine } from './NavigationEngine';
export { default as VisionController } from './VisionController';
export { default as HapticFeedback } from './HapticFeedback';
export { default as AisleImagination } from './AisleImagination';
