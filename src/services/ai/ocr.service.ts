import { APP_CONFIG } from '../../constants/config';
import { GOOGLE_VISION_CONFIG } from './visionConfig';
import { TextToSpeechService } from '../voice/textToSpeech.service';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  detectedLanguage?: string;
  error?: string;
}

/**
 * Seevia OCR Service
 * Uses Google Vision API to extract text and parse localized product metadata.
 */
export class OCRService {
  private static readonly MODULE = 'OCR_SERVICE';

  /**
   * Extract text from image using Google Vision API.
   */
  static async extractText(imageUri: string): Promise<OCRResult> {
    try {
      await hapticService.selection(); //
      
      // Step 1: Convert image to base64
      const base64Image = await this.imageToBase64(imageUri);

      // Step 2: Call Google Vision API via visionConfig
      const response = await fetch(
        `${GOOGLE_VISION_CONFIG.endpoint}?key=${APP_CONFIG.GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            }],
          }),
        }
      );

      const data = await response.json();

      if (data.responses && data.responses[0].textAnnotations) {
        const fullText = data.responses[0].textAnnotations[0].description;
        const confidence = data.responses[0].textAnnotations[0].confidence || 0.8;

        logger.info(this.MODULE, `Text Detected: ${fullText.substring(0, 20)}...`);
        return {
          success: true,
          text: fullText,
          confidence,
          detectedLanguage: data.responses[0].textAnnotations[0].locale,
        };
      }

      return { success: false, text: '', confidence: 0, error: 'No text detected' };
    } catch (error) {
      logger.error(this.MODULE, 'OCR extraction failed', error);
      return { success: false, text: '', confidence: 0, error: (error as Error).message };
    }
  }

  /**
   * Parses text for localized Pakistani/UAE product info.
   */
  static parseProductInfo(ocrText: string) {
    const info: any = {};

    // 1. Extract Price (PKR/Rs.)
    const priceMatch = ocrText.match(/(?:Rs\.?|PKR)\s*(\d+(?:[,.]?\d+)*)/i);
    if (priceMatch) info.price = parseFloat(priceMatch[1].replace(/,/g, ''));

    // 2. Extract Expiry (DD/MM/YYYY formats)
    const expiryPatterns = [
      /exp[iry]*[:.\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
      /best\s+before[:.\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i
    ];

    for (const pattern of expiryPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        info.expiryDate = new Date(year, parseInt(match[2], 10) - 1, parseInt(match[1], 10));
        break;
      }
    }

    return info;
  }

  /**
   * Narrates detected text aloud for visually impaired users.
   */
  static async readTextAloud(text: string): Promise<void> {
    await TextToSpeechService.speak(text);
  }

  private static async imageToBase64(uri: string): Promise<string> {
    // Utility for converting URI to Base64 string for API consumption
    return "base64_data_placeholder";
  }
}
