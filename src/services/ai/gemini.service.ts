import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';

// Make sure to put your actual API key in your .env file
// EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export class GeminiVisionService {
  private static readonly MODULE = 'GEMINI_VISION';

  /**
   * Analyzes an image base64 string specifically tailored for a visually impaired user.
   */
  static async analyzeProduct(base64Image: string): Promise<string> {
    try {
      logger.info(this.MODULE, 'Sending high-res frame to Gemini API...');
      
      // Use the flash model for the fastest response times
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are Seevia, an assistive AI for a visually impaired user. 
        Analyze this image and tell the user exactly what product this is. 
        Be concise but highly descriptive. Include the brand name, product type, and any visible text like flavors or warnings. 
        Keep the response conversational and under 2 sentences.
      `;

      const imageParts = [
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg' // Ensure your camera captures in JPEG
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      
      logger.info(this.MODULE, 'Gemini analysis complete.');
      return text;

    } catch (error) {
      logger.error(this.MODULE, 'Gemini API failed', error);
      throw new Error("I'm having trouble seeing that clearly right now. Please try again.");
    }
  }
}