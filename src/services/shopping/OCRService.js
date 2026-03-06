import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * OCRService.js: Tier 1 of the Vision Pipeline.
 * Extracts text for Expiry Dates and Brand Names.
 */
export default class OCRService {
  static async scan(imageUri) {
    try {
      const result = await TextRecognition.recognize(imageUri);
      
      if (!result.text) {
        return { confidence: 0, label: null, rawText: "" };
      }

      const rawText = result.text.toLowerCase();
      
      // 1. Check for Expiry Dates (Regex for DD/MM/YY or MM/YYYY)
      const expiryPattern = /\b\d{2}[\/-]\d{2}[\/-]\d{2,4}\b/;
      const foundExpiry = rawText.match(expiryPattern);

      // 2. Check for Brand Keywords (Save Mart PWD common items)
      const brands = ["tapal", "milkpak", "lays", "olpers", "youngs"];
      const detectedBrand = brands.find(brand => rawText.includes(brand));

      return {
        confidence: detectedBrand ? 0.9 : 0.5,
        label: detectedBrand || "Unknown Text",
        expiry: foundExpiry ? foundExpiry[0] : null,
        rawText: rawText
      };
    } catch (error) {
      console.error("OCR Error:", error);
      return { confidence: 0, error: true };
    }
  }
}
