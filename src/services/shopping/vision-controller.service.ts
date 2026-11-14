/**
 * Vision Controller Service (Enhanced)
 * Orchestrates multi-tier vision pipeline for product detection
 * 
 * Confidence-based routing:
 * Local (YOLO/OCR) > HuggingFace > Gemini/Groq
 * 
 * Fallback chain on low confidence or timeout
 */

import { logger } from '@/utils/logger';
import { productDatabaseService, type Product } from './product-database.service';
import type { CameraType } from 'expo-camera';

export interface DetectionResult {
  product: Product | null;
  confidence: number;
  method: 'yolo' | 'ocr' | 'gemini' | 'groq' | 'firebase';
  processingTime: number;
  expiryDate?: string;
  ocrText?: string;
  errorMessage?: string;
}

export interface DetectionConfig {
  confidenceThreshold: number; // 0-1, default 0.5
  ocrTimeout: number; // milliseconds, default 3000
  detectionTimeout: number; // milliseconds, default 5000
  enableOCR: boolean; // default true
  enableGemin: boolean; // default true
  preferredMethods: ('yolo' | 'ocr' | 'gemini' | 'groq')[];
}

class VisionControllerService {
  private readonly MODULE = 'VISION_CONTROLLER';
  private config: DetectionConfig = {
    confidenceThreshold: 0.5,
    ocrTimeout: 3000,
    detectionTimeout: 5000,
    enableOCR: true,
    enableGemin: true,
    preferredMethods: ['yolo', 'ocr', 'gemini'],
  };

  private detectionCache: Map<string, DetectionResult> = new Map();
  private lastDetectionTime: number = 0;
  private detectionInProgress: boolean = false;

  /**
   * Initialize vision controller
   */
  async initialize(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Initializing vision controller');
      // Initialize dependent services
      await productDatabaseService.initialize();
      logger.info(this.MODULE, 'Vision controller ready');
    } catch (error) {
      logger.error(this.MODULE, 'Initialization failed', error);
    }
  }

  /**
   * Main detection method - handles image input and returns product info
   */
  async detectProductFromImage(imageUri: string): Promise<DetectionResult> {
    const startTime = Date.now();

    try {
      // Prevent concurrent detections
      if (this.detectionInProgress) {
        logger.info(this.MODULE, 'Detection already in progress');
        return this.getEmptyResult('Detection already in progress', startTime);
      }

      this.detectionInProgress = true;

      // Check cache first (avoid re-processing same image)
      if (this.detectionCache.has(imageUri)) {
        return this.detectionCache.get(imageUri)!;
      }

      logger.info(this.MODULE, 'Starting product detection', { imageUri });

      let result: DetectionResult | null = null;

      // 1. Try YOLO (local, <200ms)
      result = await this.detectWithYOLO(imageUri, startTime);
      if (result && result.confidence > 0.75) {
        await productDatabaseService.recordDetection(result.product!, 'yolo');
        return this.cacheResult(imageUri, result);
      }

      // 2. Parallel: Try OCR (local, <500ms) and Firebase search
      if (this.config.enableOCR) {
        const [ocrResult, firebaseResult] = await Promise.all([
          this.detectWithOCR(imageUri, startTime),
          this.searchFirebase(result?.product?.nameEn || '', startTime),
        ]);

        if (ocrResult && ocrResult.confidence > 0.5) {
          await productDatabaseService.recordDetection(ocrResult.product!, 'ocr');
          return this.cacheResult(imageUri, ocrResult);
        }

        if (firebaseResult && firebaseResult.confidence > 0.5) {
          await productDatabaseService.recordDetection(firebaseResult.product!, 'firebase');
          return this.cacheResult(imageUri, firebaseResult);
        }
      }

      // 3. Fallback to Gemini (cloud, <2000ms)
      if (this.config.enableGemin) {
        const geminiResult = await this.detectWithGemini(imageUri, startTime);
        if (geminiResult && geminiResult.confidence > 0.4) {
          await productDatabaseService.recordDetection(geminiResult.product!, 'gemini');
          return this.cacheResult(imageUri, geminiResult);
        }
      }

      // No confident detection found
      logger.warn(this.MODULE, 'No confident detection found');
      return this.getEmptyResult('No product detected', startTime);
    } catch (error) {
      logger.error(this.MODULE, 'Detection failed', error);
      return this.getEmptyResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    } finally {
      this.detectionInProgress = false;
      this.lastDetectionTime = Date.now();
    }
  }

  /**
   * Process voice command to find product
   */
  async detectByVoiceCommand(query: string): Promise<Product | null> {
    try {
      logger.info(this.MODULE, 'Voice-based product search', { query });

      // Remove common filler words
      let cleanQuery = query.toLowerCase()
        .replace(/kya hai|what is|ye|this|mujhe/gi, '')
        .trim();

      const result = await productDatabaseService.searchProduct(cleanQuery);
      return result?.product || null;
    } catch (error) {
      logger.error(this.MODULE, 'Voice command processing failed', error);
      return null;
    }
  }

  /**
   * Get product recommendations based on detected product
   */
  async getProductRecommendations(product: Product): Promise<Product[]> {
    try {
      return await productDatabaseService.findAlternatives(product, 5);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get recommendations', error);
      return [];
    }
  }

  /**
   * Update detection configuration
   */
  setConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info(this.MODULE, 'Configuration updated', newConfig);
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
    logger.info(this.MODULE, 'Detection cache cleared');
  }

  /**
   * Get detector statistics
   */
  getStats(): {
    cacheSize: number;
    lastDetectionTime: number;
    isProcessing: boolean;
  } {
    return {
      cacheSize: this.detectionCache.size,
      lastDetectionTime: this.lastDetectionTime,
      isProcessing: this.detectionInProgress,
    };
  }

  // ==================== Private Detection Methods ====================

  /**
   * Detect using YOLO (Local, <200ms)
   */
  private async detectWithYOLO(
    imageUri: string,
    startTime: number
  ): Promise<DetectionResult | null> {
    try {
      const start = Date.now();
      logger.info(this.MODULE, 'Attempting YOLO detection');

      // Import YoloService (existing)
      const { default: YoloService } = await import('./YoloService');
      const yoloResult = await YoloService.detect(imageUri);

      const processingTime = Date.now() - start;

      if (!yoloResult) {
        logger.debug(this.MODULE, 'YOLO returned null');
        return null;
      }

      // Search database for detected product
      const dbResult = await productDatabaseService.searchProduct(yoloResult.label || '');

      if (dbResult) {
        return {
          product: dbResult.product,
          confidence: Math.min(yoloResult.confidence, 0.99),
          method: 'yolo',
          processingTime,
        };
      }

      return null;
    } catch (error) {
      logger.debug(this.MODULE, 'YOLO detection failed', error);
      return null;
    }
  }

  /**
   * Detect using OCR (Local, <500ms)
   */
  private async detectWithOCR(
    imageUri: string,
    startTime: number
  ): Promise<DetectionResult | null> {
    try {
      const start = Date.now();
      logger.info(this.MODULE, 'Attempting OCR detection');

      const { default: OCRService } = await import('./OCRService');
      const ocrResult = await OCRService.scan(imageUri);

      const processingTime = Date.now() - start;

      if (!ocrResult || ocrResult.confidence < 0.3) {
        logger.debug(this.MODULE, 'OCR confidence too low');
        return null;
      }

      // Try to find product by OCR detected brand or text
      let product: Product | null = null;
      if (ocrResult.label) {
        const dbResult = await productDatabaseService.searchProduct(ocrResult.label);
        product = dbResult?.product || null;
      }

      if (product) {
        // Update expiry if found
        if (ocrResult.expiry) {
          product.expiryDate = ocrResult.expiry;
        }

        return {
          product,
          confidence: ocrResult.confidence,
          method: 'ocr',
          processingTime,
          ocrText: ocrResult.rawText,
          expiryDate: ocrResult.expiry,
        };
      }

      return null;
    } catch (error) {
      logger.debug(this.MODULE, 'OCR detection failed', error);
      return null;
    }
  }

  /**
   * Search Firebase for product (cached)
   */
  private async searchFirebase(
    query: string,
    startTime: number
  ): Promise<DetectionResult | null> {
    try {
      if (!query) return null;

      const start = Date.now();
      logger.info(this.MODULE, 'Searching Firebase', { query });

      const dbResult = await productDatabaseService.searchProduct(query);
      const processingTime = Date.now() - start;

      if (dbResult && dbResult.similarity > 0.5) {
        return {
          product: dbResult.product,
          confidence: dbResult.similarity,
          method: 'firebase',
          processingTime,
        };
      }

      return null;
    } catch (error) {
      logger.debug(this.MODULE, 'Firebase search failed', error);
      return null;
    }
  }

  /**
   * Detect using Gemini API (Cloud, <2000ms)
   */
  private async detectWithGemini(
    imageUri: string,
    startTime: number
  ): Promise<DetectionResult | null> {
    try {
      const start = Date.now();
      logger.info(this.MODULE, 'Attempting Gemini detection');

      const { default: GeminiService } = await import('./GeminiService');
      const geminiResult = await GeminiService.analyze(imageUri);

      const processingTime = Date.now() - start;

      if (!geminiResult || geminiResult.confidence < 0.3) {
        logger.debug(this.MODULE, 'Gemini confidence too low');
        return null;
      }

      // Search database for product identified by Gemini
      const dbResult = await productDatabaseService.searchProduct(geminiResult.productName || '');

      if (dbResult) {
        return {
          product: dbResult.product,
          confidence: geminiResult.confidence,
          method: 'gemini',
          processingTime,
        };
      }

      // If not in database, create temporary product entry
      const tempProduct: Product = {
        id: `temp_${Date.now()}`,
        nameEn: geminiResult.productName,
        nameUr: geminiResult.productNameUr || geminiResult.productName,
        category: geminiResult.category || 'Unknown',
        brand: geminiResult.brand || 'Unknown',
        description: geminiResult.description,
        tags: [geminiResult.category || ''],
        confidence: geminiResult.confidence,
      };

      return {
        product: tempProduct,
        confidence: geminiResult.confidence,
        method: 'gemini',
        processingTime,
      };
    } catch (error) {
      logger.debug(this.MODULE, 'Gemini detection failed', error);
      return null;
    }
  }

  // ==================== Helper Methods ====================

  private cacheResult(imageUri: string, result: DetectionResult): DetectionResult {
    this.detectionCache.set(imageUri, result);
    // Keep cache size under control (max 20 entries)
    if (this.detectionCache.size > 20) {
      const firstKey = this.detectionCache.keys().next().value;
      this.detectionCache.delete(firstKey);
    }
    return result;
  }

  private getEmptyResult(errorMessage: string, startTime: number): DetectionResult {
    return {
      product: null,
      confidence: 0,
      method: 'yolo',
      processingTime: Date.now() - startTime,
      errorMessage,
    };
  }
}

// Export singleton instance
export const visionControllerService = new VisionControllerService();
