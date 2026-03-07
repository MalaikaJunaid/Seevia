/**
 * Seevia Global Type Definitions
 * The technical contract for data flowing between Modules 1-5.
 */

// 1. Navigation Parameter List
export type RootStackParamList = {
  onboarding: undefined;
  '(tabs)': undefined;
  'pantry/item-detail': { id: string };
  'pantry/scan-confirm': { productData: string; imageUri: string };
  'shopping/health-check': { productData: string };
  'emergency/sos-active': undefined;
  'emergency/caregiver-connect': undefined;
};

// 2. Smart Pantry Models
export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'pcs' | 'kg' | 'liters' | 'grams';
  category: string;
  expiryDate?: string;
  barcode?: string;
  lowStockThreshold: number;
  updatedAt: any; // Firebase Timestamp
}

// 3. AI Vision Results
export interface ScanResult {
  name: string;
  confidence: number;
  category: string;
  ingredients: string[];
  suggestedExpiryDays?: number;
}

// 4. Trust Circle Models
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  allergies: string[];
  medications: string[];
  emergencyContact: string;
  caregiverName?: string;
  isSetupComplete: boolean;
}
