/**
 * Seevia Pantry Item Model
 * Defines the structure for inventory tracking and smart alerts.
 */

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
  MEDICINE = 'Medicine',
  HOUSEHOLD = 'Household',
  PERSONAL_CARE = 'Personal Care', 
  
  OTHER = 'Other',
}

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  nameUr?: string; // Optional Urdu name for better Voice TTS
  category: PantryCategory;
  quantity: number;
  unit: 'pieces' | 'kg' | 'g' | 'liters' | 'ml' | 'packets' | 'bottles' | 'boxes' | 'strips' | 'tablets' | string;
  
  // Expiry & Tracking
  expiryDate: Date | string | null; // Handle both Date objects and ISO strings from Firestore
  addedDate: Date | string;
  lastUpdated?: string;
  lastRestockedDate?: Date | string;
  
  // AI & Scanner Metadata
  barcode?: string;
  imageUrl?: string;
  
  // 🛡️ HEALTH & SAFETY (The Fix for Allergen Service)
  allergies?: string[]; // Potential allergens like ['dairy', 'peanuts']
  
  // Smart Thresholds
  lowStockThreshold: number;
  isLowStock?: boolean; 
  avgDailyUsage?: number; // Consumed units per day (calculated by UsageLearner)
  
  // Localization & Notes
  notes?: string;
  price?: number; 
}

/**
 * Interface for creating or updating pantry items.
 */
export interface PantryItemInput {
  name: string;
  nameUr?: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  expiryDate?: Date | string;
  barcode?: string;
  imageUrl?: string;
  lowStockThreshold?: number;
  allergies?: string[];
  notes?: string;
  price?: number;
}