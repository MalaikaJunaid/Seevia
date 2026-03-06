import OCRService from './OCRService';
import YoloService from './YoloService';
import GeminiService from './GeminiService';
import TtsService from '../voice/TtsService';
import HealthGuard from '../pantry/HealthGuard'; // Added for Safety
import { getUserProfile } from '../profile/ProfileService'; // Added for Context

export default class VisionController {
  static lastDetected = null; 
  static isProcessing = false;

  static async analyzeFrame(imageUri) {
    if (this.isProcessing) return; // Prevent overlapping calls
    this.isProcessing = true;

    try {
      // TIER 1: OCR (Check for Barcode or Text)
      const ocrResult = await OCRService.scan(imageUri);
      if (ocrResult && ocrResult.confidence > 0.85) {
        return await this.processResult(ocrResult, "OCR");
      }

      // TIER 2: YOLOv11 (Brand Recognition)
      const yoloResult = await YoloService.detect(imageUri);
      if (yoloResult && yoloResult.confidence > 0.70) {
        return await this.processResult(yoloResult, "YOLO");
      }

      // TIER 3: GEMINI FALLBACK (Reasoning)
      // Only call if something is clearly in frame but unidentified
      TtsService.speak("Identifying item... please hold steady.");
      const geminiResult = await GeminiService.describe(imageUri);
      return await this.processResult(geminiResult, "Gemini");

    } catch (error) {
      console.error("Vision Error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  static async processResult(result, source) {
    // 1. Debouncing: Don't repeat if it's the same item found 1 second ago
    if (this.lastDetected === result.label) return result;
    this.lastDetected = result.label;

    // 2. Health Safety Cross-Check (The "Safety Guard")
    const userProfile = await getUserProfile();
    const safety = HealthGuard.validateSafety(
      { product_name: result.label, allergy_tags: result.tags || [] },
      userProfile
    );

    // 3. Multimodal Feedback
    if (!safety.isSafe) {
      TtsService.speak(`Warning! ${safety.message}`);
    } else {
      TtsService.speak(`${result.label} detected via ${source}.`);
    }

    console.log(`[Seevia Vision] Verified via ${source}`);
    return result;
  }
}
