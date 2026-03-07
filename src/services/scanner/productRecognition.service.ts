import { APP_CONFIG } from '@/src/constants/config';
import { imageProcessing } from '@/src/utils/imageProcessing';
import { hapticService } from '@/src/services/common/haptic.service';
import { PantryItem } from '@/src/models/PantryItem';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Product Recognition Service
 * Uses Computer Vision to identify items and extract expiry/nutrition data.
 */
class ProductRecognitionService {
  private readonly MODULE = 'PRODUCT_RECOGNITION';

  /**
   * Identifies a product from a camera URI
   */
  async identifyProduct(uri: string): Promise<Partial<PantryItem> | null> {
    try {
      logger.info(this.MODULE, 'Starting AI Vision analysis...');
      
      // 1. Pre-process image (Resize/Compress)
      const processedImage = await imageProcessing.prepareForAI(uri);
      
      // 2. Call Gemini Vision API
      const result = await this.callGeminiVision(processedImage.base64!);
      
      if (result) {
        await hapticService.success();
        return result;
      }
      
      await hapticService.warning();
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'AI Identification failed', error);
      await hapticService.error();
      return null;
    }
  }

  private async callGeminiVision(base64Image: string): Promise<Partial<PantryItem> | null> {
    const prompt = `
      Identify this food product. Return a JSON object with:
      name (string), 
      category (string: Dairy, Grains, Meat, etc.), 
      suggestedExpiryDays (number),
      description (short sentence for a blind user).
      If the brand is local to Pakistan or UAE, specify it.
    `;

    try {
      const response = await fetch(`${APP_CONFIG.GEMINI_API_URL}?key=${APP_CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: base64Image } }
            ]
          }]
        })
      });

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      
      // Clean and parse JSON from Markdown response
      const jsonStr = textResponse.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      logger.error(this.MODULE, 'Gemini parsing error', e);
      return null;
    }
  }
}

export const productRecognitionService = new ProductRecognitionService();
