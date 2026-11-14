import { VISION_CONFIG } from './visionConfig';
import { APP_CONFIG } from '@/constants/config';
import { Product, DetectedProduct, ProductRecognitionResult } from '@/models/Product';
import { OCRService } from './ocr.service';
import { aiFallbackService } from './aiFallback.service';
import { yoloService } from '../scanner/yolo.service';
import { hapticService } from '../common/haptic.service';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system';

/**
 * Seevia Product Recognition Service
 * Multi-tier AI fallback: Local TFLite → YOLO → OCR → Gemini
 * Confidence threshold: 0.95 for assistive tech safety
 */
export class ProductRecognitionService {
  private static readonly MODULE = 'PRODUCT_RECOGNITION';
  private static readonly CONFIDENCE_THRESHOLD = APP_CONFIG.PRODUCT_RECOGNITION_CONFIDENCE_THRESHOLD; // 0.95

  /**
   * Main entry point: Recognizes a product from an image URI.
   * Priority: Local YOLO → Gemini Vision → OCR Fallback
   */
  static async recognizeProduct(imageUri: string): Promise<ProductRecognitionResult> {
    try {
      logger.info(this.MODULE, 'Analyzing image for product recognition...');

      // Step 0: Convert to base64 for all AI operations
      const base64Image = await this.imageToBase64(imageUri);

      // Step 1: Try YOLO/local detection first
      const yoloResult = await yoloService.detect(base64Image);

      if (yoloResult.detections.length > 0 && yoloResult.detections[0].confidence >= this.CONFIDENCE_THRESHOLD) {
        await hapticService.success();
        logger.info(this.MODULE, `YOLO detection success (${yoloResult.detections[0].confidence.toFixed(2)})`);

        return {
          success: true,
          product: {
            id: `yolo-${Date.now()}`,
            name: yoloService.getUrduLabel(yoloResult.detections[0].label),
            brand: 'Detected via AI',
            category: this.inferCategory(yoloResult.detections[0].label),
            confidence: yoloResult.detections[0].confidence,
          } as DetectedProduct,
          method: yoloResult.provider,
        };
      }

      // Step 2: Try Gemini Vision for detailed product recognition
      logger.info(this.MODULE, `YOLO confidence ${yoloResult.detections[0]?.confidence?.toFixed(2) || 0} < ${this.CONFIDENCE_THRESHOLD}, trying Gemini`);
      const geminiResult = await aiFallbackService.executeVisionTask(base64Image, 'label_detection');

      if (geminiResult.success && geminiResult.confidence >= APP_CONFIG.AI_HUGGINGFACE_THRESHOLD) {
        const topLabel = geminiResult.data.labels[0];
        if (topLabel) {
          await hapticService.success();
          return {
            success: true,
            product: {
              id: `gemini-${Date.now()}`,
              name: topLabel.description,
              brand: 'Detected via Gemini',
              category: this.inferCategory(topLabel.description),
              confidence: topLabel.confidence,
            } as DetectedProduct,
            method: 'gemini',
          };
        }
      }

      // Step 3: Fallback to OCR if image has text
      logger.info(this.MODULE, 'AI detection low confidence, initiating OCR fallback...');
      const ocrResult = await OCRService.extractText(imageUri);

      if (ocrResult.success && ocrResult.text.length > 0) {
        const productInfo = OCRService.parseProductInfo(ocrResult.text);
        return {
          success: true,
          product: {
            id: `ocr-${Date.now()}`,
            name: productInfo.productName || 'Unknown Item',
            brand: (productInfo.brand as string) || 'Detected via Text',
            category: 'Grocery',
            confidence: ocrResult.confidence,
            expiryDate: productInfo.expiryDate as Date,
          } as DetectedProduct,
          fallbackToOCR: true,
          method: 'ocr',
        };
      }

      // Step 4: Final fallback - ask user to add manually
      await hapticService.warning();
      return {
        success: false,
        error: 'Recognition confidence too low. Please add item manually.',
      };
    } catch (error) {
      logger.error(this.MODULE, 'Product recognition crash', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Scene Imagination: Describes the environment to a blind user.
   */
  static async describeScene(imageUri: string): Promise<string> {
    try {
      const base64Image = await this.imageToBase64(imageUri);
      const result = await aiFallbackService.describeScene(base64Image, 'Describe scene for navigation');

      if (result.success) {
        return result.data;
      }

      return "I'm having trouble seeing the room. Please hold the camera steady.";
    } catch (error) {
      return "I'm having trouble seeing the room. Please hold the camera steady.";
    }
  }

  /**
   * Infer product category from label
   */
  private static inferCategory(label: string): string {
    const categories: Record<string, string[]> = {
      'Dairy': ['milk', 'yogurt', 'dahi', 'doodh', 'cheese', 'butter', 'cream'],
      'Beverages': ['juice', 'water', 'pani', 'tea', 'chai', 'coffee', 'soda'],
      'Grains': ['flour', 'atta', 'rice', 'chawal', 'bread', 'pasta', 'cereal'],
      'Spices': ['salt', 'namak', 'sugar', 'cheeni', 'pepper', 'masala', 'spice'],
      'Snacks': ['biscuit', 'chips', 'cookies', 'crackers', 'cake'],
      'Personal Care': ['soap', 'sabun', 'shampoo', 'toothpaste', 'lotion'],
      'Medicine': ['panadol', 'medicine', 'tablet', 'syrup'],
    };

    const lowerLabel = label.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerLabel.includes(keyword))) {
        return category;
      }
    }
    return 'Grocery';
  }

  /**
   * Convert image URI to base64
   */
  private static async imageToBase64(uri: string): Promise<string> {
    try {
      if (uri.startsWith('data:')) {
        return uri.split(',')[1];
      }

      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to convert image to base64', error);
      throw error;
    }
  }
}

export const productRecognitionService = new ProductRecognitionService();
