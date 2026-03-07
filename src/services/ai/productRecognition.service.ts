import { GOOGLE_VISION_CONFIG } from './visionConfig';
import { APP_CONFIG } from '../../constants/config';
import { Product, ProductRecognitionResult } from '../../models/Product';
import { OCRService } from './ocr.service';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Product Recognition Service
 * Orchestrates Label Detection, OCR, and Scene Imagination for PWD assistance.
 */
export class ProductRecognitionService {
  private static readonly MODULE = 'PRODUCT_RECOGNITION';

  /**
   * Main entry point: Recognizes a product from an image URI.
   * Priority: Label Detection (AI) -> OCR Fallback.
   */
  static async recognizeProduct(imageUri: string): Promise<ProductRecognitionResult> {
    try {
      logger.info(this.MODULE, 'Analyzing image for product recognition...');
      
      // Step 1: Attempt AI Label Detection
      const labelResult = await this.detectLabels(imageUri);

      if (labelResult.success && (labelResult.product?.confidence ?? 0) >= APP_CONFIG.PRODUCT_RECOGNITION_CONFIDENCE_THRESHOLD) {
        await hapticService.success(); //
        return labelResult;
      }

      // Step 2: Fallback to OCR if image is blurry or brand is unknown
      logger.info(this.MODULE, 'Low label confidence, initiating OCR fallback...');
      const ocrResult = await OCRService.extractText(imageUri);

      if (ocrResult.success) {
        return {
          success: true,
          product: {
            id: `ocr-${Date.now()}`,
            name: OCRService.parseProductInfo(ocrResult.text).productName || 'Unknown Item',
            brand: 'Detected via Text',
            category: 'Grocery',
            confidence: ocrResult.confidence,
          } as Product,
          fallbackToOCR: true,
        };
      }

      return { success: false, error: 'Recognition failed. Please try manual entry.' };
    } catch (error) {
      logger.error(this.MODULE, 'Product recognition crash', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Scene Imagination: Describes the environment to a blind user.
   * Logic migrated from SceneImagination.js.
   */
  static async describeScene(imageUri: string): Promise<string> {
    try {
      // Logic would call Vision API 'LABEL_DETECTION' here
      return "I see a brightly lit grocery aisle with shelves on your left. There are breakfast cereals nearby.";
    } catch (error) {
      return "I'm having trouble seeing the room. Please hold the camera steady.";
    }
  }

  private static async detectLabels(imageUri: string): Promise<ProductRecognitionResult> {
    // Implement actual POST to GOOGLE_VISION_CONFIG.endpoint here
    return {
      success: true,
      product: {
        id: 'mock-1',
        name: 'Olpers Milk',
        brand: 'Engro',
        category: 'Dairy',
        confidence: 0.95
      } as Product
    };
  }
}
