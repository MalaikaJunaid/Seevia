/**
 * Pantry Item Models (Re-exports from pantry service)
 * This file acts as a central export point for PantryItem types used across the application
 */

export type { PantryItem } from '@/services/pantry/pantry-management.service';

export enum PantryCategory {
  DAIRY = 'DAIRY',
  GRAINS = 'GRAINS',
  BEVERAGES = 'BEVERAGES',
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  MEAT = 'MEAT',
  SPICES = 'SPICES',
  CONDIMENTS = 'CONDIMENTS',
  FROZEN = 'FROZEN',
  OILS = 'OILS',
  SNACKS = 'SNACKS',
  BAKERY = 'BAKERY',
}

/**
 * Input type for creating/updating pantry items
 * Omits auto-generated fields like id, userId, and addedDate
 */
export type PantryItemInput = Omit<
  import('@/services/pantry/pantry-management.service').PantryItem,
  'id' | 'userId' | 'addedDate'
>;
