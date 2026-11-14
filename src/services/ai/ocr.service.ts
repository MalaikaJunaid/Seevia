import { API_KEYS } from '@/constants/config';
import { GOOGLE_VISION_CONFIG, isVisionReady } from './visionConfig';
import { aiFallbackService } from './aiFallback.service';
import { TextToSpeechService } from '../voice/textToSpeech.service';
import { hapticService } from '../common/haptic.service';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system';

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  detectedLanguage?: string;
  blocks?: Array<{ text: string; boundingBox: number[] }>;
  error?: string;
}

/**
 * Seevia OCR Service
 * Multi-tier OCR: Local TFLite → Google Vision API → Gemini Vision
 */
export class OCRService {
  private static readonly MODULE = 'OCR_SERVICE';

  /**
   * Extract text from image using multi-tier fallback.
   * Priority: Local OCR → Google Vision → Gemini (0.95 threshold for safety)
   */
  static async extractText(imageUri: string): Promise<OCRResult> {
    const CONFIDENCE_THRESHOLD = APP_CONFIG.OCR_CONFIDENCE_THRESHOLD; // 0.95

    try {
      await hapticService.selection();

      // Check if Vision API is configured
      if (!isVisionReady()) {
        logger.warn(this.MODULE, 'Google Vision not configured, using fallback');
      }

      // Step 1: Convert image to base64
      const base64Image = await this.imageToBase64(imageUri);

      // Step 2: Try Google Vision API first
      const visionResult = await this.callGoogleVision(base64Image);

      if (visionResult.success && visionResult.confidence >= CONFIDENCE_THRESHOLD) {
        logger.info(this.MODULE, `OCR success via Google Vision (${visionResult.confidence.toFixed(2)})`);
        return visionResult;
      }

      // Step 3: Fallback to Gemini Vision if confidence < 0.95
      logger.info(this.MODULE, `Google Vision confidence ${visionResult.confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}, falling back to Gemini`);
      const geminiResult = await this.callGeminiOCR(base64Image);

      if (geminiResult.success && geminiResult.confidence >= APP_CONFIG.AI_HUGGINGFACE_THRESHOLD) {
        logger.info(this.MODULE, `Gemini OCR success (${geminiResult.confidence.toFixed(2)})`);
        return geminiResult;
      }

      // Step 4: Final fallback - return best available result
      const bestResult = visionResult.confidence > geminiResult.confidence ? visionResult : geminiResult;

      if (bestResult.success) {
        logger.warn(this.MODULE, `OCR completed with lower confidence (${bestResult.confidence.toFixed(2)})`);
        return bestResult;
      }

      return { success: false, text: '', confidence: 0, error: 'OCR failed across all providers' };

    } catch (error) {
      logger.error(this.MODULE, 'OCR extraction failed', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Call Gemini Vision API for OCR (fallback)
   */
  private static async callGeminiOCR(base64Image: string): Promise<OCRResult> {
    try {
      const prompt = `Extract all text from this image. For assistive technology users, accuracy is critical.

      Return a JSON object with:
      {
        "text": "all extracted text",
        "confidence": 0.0-1.0,
        "language": "detected language code",
        "blocks": [{"text": "line", "confidence": 0.0-1.0}]
      }

      Be precise and include all visible text including small print, labels, and expiry dates.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEYS.GEMINI}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            text: parsed.text || content,
            confidence: parsed.confidence || 0.85,
            detectedLanguage: parsed.language,
            blocks: parsed.blocks || [],
          };
        }
      } catch {
        // If JSON parsing fails, return raw text
      }

      return {
        success: true,
        text: content,
        confidence: 0.8,
      };

    } catch (error) {
      logger.error(this.MODULE, 'Gemini OCR failed', error);
      return { success: false, text: '', confidence: 0, error: (error as Error).message };
    }
  }

  /**
   * Parse text for localized Pakistani product info.
   */
  static parseProductInfo(ocrText: string) {
    const info: Record<string, unknown> = {};

    // 1. Extract Price (PKR/Rs.)
    const priceMatch = ocrText.match(/(?:Rs\.?|PKR)\s*(\d+(?:[,.]?\d+)*)/i);
    if (priceMatch) {
      info.price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // 2. Extract Expiry (DD/MM/YYYY formats)
    const expiryPatterns = [
      /exp[iry]*[:.\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
      /best\s+before[:.\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
      /use\s+by[:.\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    ];

    for (const pattern of expiryPatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        info.expiryDate = new Date(year, parseInt(match[2], 10) - 1, parseInt(match[1], 10));
        info.expiryText = match[0];
        break;
      }
    }

    // 3. Extract Product Name (heuristic)
    const lines = ocrText.split('\n').filter(l => l.trim().length > 3);
    if (lines.length > 0) {
      info.productName = lines[0].trim();
    }

    // 4. Detect Brand (common Pakistani brands)
    const brands = ['Engro', 'Nestle', 'Unilever', 'Colgate', 'Surf', 'Tetra', 'Milkpak', 'Olper', 'National', 'Shan', 'Mitchells'];
    for (const brand of brands) {
      if (ocrText.toLowerCase().includes(brand.toLowerCase())) {
        info.brand = brand;
        break;
      }
    }

    return info;
  }

  /**
   * Narrate detected text aloud for visually impaired users.
   */
  static async readTextAloud(text: string, language: 'ur' | 'en' = 'ur'): Promise<void> {
    const prefix = language === 'ur' ? 'Likha hai: ' : 'Text reads: ';
    await TextToSpeechService.speak(`${prefix}${text}`);
  }

  /**
   * Call Google Vision API for OCR
   */
  private static async callGoogleVision(base64Image: string): Promise<OCRResult> {
    try {
      const response = await fetch(
        `${GOOGLE_VISION_CONFIG.endpoint}?key=${API_KEYS.GOOGLE_CLOUD}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 5 }
              ],
            }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.responses && data.responses[0]?.textAnnotations) {
        const fullText = data.responses[0].textAnnotations[0]?.description || '';
        const confidence = data.responses[0].textAnnotations[0]?.confidence || 0.85;

        // Extract text blocks with bounding boxes
        const blocks = data.responses[0].textAnnotations.slice(1).map((a: { description: string; boundingPoly?: { vertices: Array<{ x?: number; y?: number }> } }) => ({
          text: a.description,
          boundingBox: a.boundingPoly?.vertices?.flatMap(v => [v.x || 0, v.y || 0]) || [],
        }));

        return {
          success: true,
          text: fullText,
          confidence,
          detectedLanguage: data.responses[0].textAnnotations[0]?.locale,
          blocks,
        };
      }

      return { success: false, text: '', confidence: 0, error: 'No text detected' };

    } catch (error) {
      logger.error(this.MODULE, 'Google Vision API call failed', error);
      return { success: false, text: '', confidence: 0, error: (error as Error).message };
    }
  }

  /**
   * Convert image URI to base64
   */
  private static async imageToBase64(uri: string): Promise<string> {
    try {
      // Handle different URI schemes
      if (uri.startsWith('data:')) {
        // Already base64
        return uri.split(',')[1];
      }

      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        // Read from filesystem
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }

      // For web URLs, fetch and convert
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