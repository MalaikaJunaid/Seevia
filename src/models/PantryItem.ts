/**
 * Seevia Pantry Item Model
 * Defines the structure for inventory tracking and smart alerts.
 */

export enum PantryCategory {
  DAIRY = 'Dairy',
  FRUITS = 'Fruits & Vegetables',
  MEAT = 'Meat & Seafood',
  GRAINS = 'Grains & Cereals',
  BEVERAGES = 'Beverages',
  SNACKS = 'Snacks',
  CONDIMENTS = 'Condiments',
  FROZEN = 'Frozen Foods',
  BAKERY = 'Bakery',
  MEDICINE = 'Medicine', // Added for PWD Health Tracking
  OTHER = 'Other',
}

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: 'pieces' | 'kg' | 'g' | 'liters' | 'ml' | 'packets' | 'bottles' | 'boxes' | 'strips' | 'tablets';
  
  // Expiry & Tracking
  expiryDate: Date | null;
  addedDate: Date;
  lastRestockedDate?: Date;
  
  // AI & Scanner Metadata
  barcode?: string;
  imageUrl?: string;
  
  // Smart Thresholds
  lowStockThreshold: number;
  isLowStock: boolean; // Calculated helper for UI alerts
  
  // Localization & Notes
  notes?: string;
  price?: number; // In PKR or AED depending on user location
}

/**
 * Interface for creating or updating pantry items.
 */
export interface PantryItemInput {
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  expiryDate?: Date;
  barcode?: string;
  imageUrl?: string;
  lowStockThreshold?: number;
  notes?: string;
  price?: number;
}
