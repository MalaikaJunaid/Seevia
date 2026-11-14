/**
 * OCRService.js: Tier 1 of the Vision Pipeline.
 * Extracts text for Expiry Dates and Brand Names.
 * Note: In production, uses native ML Kit. In dev/web, uses fallback.
 */

let TextRecognition = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (e) {
  // Silent - native module not available in dev mode, using fallback
  TextRecognition = null;
}

export default class OCRService {
  static async scan(imageUri) {
    try {
      let result = null;

      // Try native module first (on device)
      if (TextRecognition) {
        result = await TextRecognition.recognize(imageUri);
      } else {
        // Fallback for web/dev mode
        console.log('OCRService: Using fallback (native module unavailable)');
        result = { text: 'Sample Product Text - Expiry: 12/2024' };
      }

      if (!result || !result.text) {
        return { confidence: 0, label: null, rawText: '' };
      }

      const rawText = result.text.toLowerCase();

      // 1. Check for Expiry Dates (Regex for DD/MM/YY or MM/YYYY)
      const expiryPattern = /\b\d{2}[\/-]\d{2}[\/-]\d{2,4}\b/;
      const foundExpiry = rawText.match(expiryPattern);

      // 2. Check for Brand Keywords (Save Mart PWD common items)
      const brands = ['tapal', 'milkpak', 'lays', 'olpers', 'youngs'];
      const detectedBrand = brands.find(brand => rawText.includes(brand));

      return {
        confidence: detectedBrand ? 0.9 : 0.5,
        label: detectedBrand || 'Unknown Text',
        expiry: foundExpiry ? foundExpiry[0] : null,
        rawText: rawText
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return { confidence: 0, error: true };
    }
  }
}
