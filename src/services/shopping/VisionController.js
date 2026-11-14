import { logger } from '@/utils/logger';
import GeminiService from './GeminiService'; // Ensure this matches your actual path

export default class VisionController {
  static async analyzeFrame(inputData) {
    logger.info('VISION_CONTROLLER', `Analyzing input...`);
    
    try {
      // 1. Check if it's a raw barcode instead of an image
      if (typeof inputData === 'string' && !inputData.startsWith('file://') && !inputData.startsWith('http')) {
         return { label: "Scanned Product", source: "Barcode Scanner", barcode: inputData };
      }

      // 2. Real AI Call
      const aiResult = await GeminiService.identifyImage(inputData);
      
      // 3. Ensure the result is valid
      if (aiResult && typeof aiResult === 'object') {
          return aiResult; 
      } else {
          throw new Error("AI returned undefined data.");
      }

    } catch (error) {
      logger.error('VISION_CONTROLLER', 'AI Identification failed', error);
      // Fails gracefully instead of crashing the app
      return { label: "Unknown Item", category: "Grocery", tags: [] }; 
    }
  }
}