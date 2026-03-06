import OCRService from './OCRService';
import YoloService from './YoloService';
import GeminiService from './GeminiService';
import TtsService from '../voice/TtsService';

export default class VisionController {
  static async analyzeFrame(imageUri) {
    // TIER 1: OCR (Check for Barcode or Text)
    const ocrResult = await OCRService.scan(imageUri);
    if (ocrResult.confidence > 0.85) {
      return this.processResult(ocrResult, "OCR");
    }

    // TIER 2: YOLOv11 (Check for Product Shape/Color)
    const yoloResult = await YoloService.detect(imageUri);
    if (yoloResult.confidence > 0.70) {
      return this.processResult(yoloResult, "YOLO");
    }

    // TIER 3: GEMINI FALLBACK (The "Human-Like" Reasoner)
    TtsService.speak("Halt. Identifying complex item via Seevia Cloud...");
    const geminiResult = await GeminiService.describe(imageUri);
    
    return this.processResult(geminiResult, "Gemini");
  }

  static processResult(result, source) {
    console.log(`Verified via ${source}`);
    TtsService.speak(`Found ${result.label}.`);
    return result;
  }
}
