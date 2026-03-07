// src/constants/categories.ts
import { PantryCategory } from '@/src/models/PantryItem';

/**
 * Standardized Pantry Categories for Seevia Inventory.
 * Updated to include essential health and medicine tracking for PWD.
 */
export const PANTRY_CATEGORIES = [
  { value: PantryCategory.DAIRY, label: 'Dairy', icon: '🥛' },
  { value: PantryCategory.FRUITS, label: 'Fruits & Vegetables', icon: '🍎' },
  { value: PantryCategory.MEAT, label: 'Meat & Seafood', icon: '🍖' },
  { value: PantryCategory.GRAINS, label: 'Grains & Cereals', icon: '🌾' },
  { value: PantryCategory.BEVERAGES, label: 'Beverages', icon: '🥤' },
  { value: PantryCategory.SNACKS, label: 'Snacks', icon: '🍪' },
  { value: PantryCategory.CONDIMENTS, label: 'Condiments', icon: '🧂' },
  { value: PantryCategory.FROZEN, label: 'Frozen Foods', icon: '❄️' },
  { value: PantryCategory.BAKERY, label: 'Bakery', icon: '🍞' },
  { value: PantryCategory.MEDICINE, label: 'Medicine & Health', icon: '💊' }, 
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
