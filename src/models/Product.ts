/**
 * Seevia Product Model
 * Defines the structure for items identified by AI Vision or Barcode Scanning.
 */

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  category: string;
  variants?: string[];
  imageUrl?: string;
  
  // OCR & Intelligence Context
  commonOCRPatterns?: string[]; 
  averageShelfLife?: number;   // In days (Source for ExpiryService)
  averagePrice?: number;       // In PKR/AED
  
  // Accessibility & Safety Circle
  allergens?: string[];        // Essential for PWD safety
  isMedical?: boolean;         // Flag for Module 3: Medicine Tracking
}

export interface DetectedProduct extends Product {
  confidence: number;          // 0-1 detection confidence (checks against config.ts)
  detectedText?: string[];     // Raw OCR output
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProductRecognitionResult {
  success: boolean;
  product?: DetectedProduct;
  error?: string;
  fallbackToOCR?: boolean;     // True if image analysis failed but OCR found text
}
