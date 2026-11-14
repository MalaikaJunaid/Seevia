// src/constants/categories.ts
import { PantryCategory } from '@/models/PantryItem';

/**
 * Standardized Pantry Categories for Seevia Inventory.
 * Fully synchronized with the updated PantryCategory enum.
 */
export const PANTRY_CATEGORIES = [
  // Fresh & Perishables
  { value: PantryCategory.DAIRY, label: 'Dairy', icon: '🥛' },
  { value: PantryCategory.FRUITS, label: 'Fruits', icon: '🍎' },
  { value: PantryCategory.VEGETABLES, label: 'Vegetables', icon: '🥦' },
  { value: PantryCategory.MEAT, label: 'Meat & Seafood', icon: '🍖' },
  { value: PantryCategory.BAKERY, label: 'Bakery', icon: '🍞' },

  // Staples & Pantry
  { value: PantryCategory.GRAINS, label: 'Grains & Cereals', icon: '🌾' },
  { value: PantryCategory.DAAL_PULSES, label: 'Daal & Pulses', icon: '🫘' },
  { value: PantryCategory.OILS_FATS, label: 'Oils & Fats', icon: '🧈' }, 
  { value: PantryCategory.SPICES, label: 'Spices', icon: '🌶️' },
  { value: PantryCategory.CONDIMENTS, label: 'Condiments', icon: '🧂' },
  { value: PantryCategory.CANNED_GOODS, label: 'Canned Goods', icon: '🥫' },

  // Snacks & Beverages
  { value: PantryCategory.BEVERAGES, label: 'Beverages', icon: '🥤' },
  { value: PantryCategory.SNACKS, label: 'Snacks', icon: '🍪' },
  { value: PantryCategory.FROZEN, label: 'Frozen Foods', icon: '❄️' },

  // Health & Home
  { value: PantryCategory.MEDICINE, label: 'Medicine', icon: '💊' }, 
  { value: PantryCategory.HOUSEHOLD, label: 'Household', icon: '🧽' }, 
  { value: PantryCategory.PERSONAL_CARE, label: 'Personal Care', icon: '🧴' }, 
  
  // Misc
  { value: PantryCategory.OTHER, label: 'Other', icon: '📦' },
];

/**
 * Standardized Unit Options.
 * Expanded to support pharmaceutical tracking (strips/tablets).
 */
export const UNIT_OPTIONS = [
  'pieces',
  'kg',
  'g',
  'liters',
  'ml',
  'packets',
  'cans',
  'bottles',
  'boxes',
  'strips',
  'tablets',
];