import { dietaryPreferencesService } from './dietary-preferences.service';
import { logger } from '@/utils/logger';
import { API_KEYS } from '@/constants/config'; // Make sure to import your API keys!

/**
 * HealthGuard Middleware (Demo Mode Powered by Groq LLM)
 * Intercepts food items and validates them against the user's dietary profile.
 */
export default class HealthGuard {
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  /**
   * Validates if a product is safe for a specific user.
   * 
   * @param userId - The Firebase UID of the current user.
   * @param itemData - Data from the pantry/scanner { product_name, allergy_tags }.
   */
  static async validateSafety(
    userId: string,
    itemData: { product_name: string; allergy_tags?: string[] }
  ): Promise<{ isSafe: boolean; message: string; reason?: string }> {
    
    try {
      // 1. Safe Defaults
      const productName = itemData?.product_name || "Unknown item";
      
      // 2. Fetch real user allergens from your existing service
      let userAllergens = ['peanuts']; // Fallback demo default just in case
      try {
         // Assuming your dietary service has a method to get the user's saved preferences
         const prefs = await dietaryPreferencesService.getPreferences(userId);
         if (prefs && prefs.allergies && prefs.allergies.length > 0) {
             userAllergens = prefs.allergies;
         }
      } catch (e) {
         logger.warn('HEALTH_GUARD', 'Could not fetch user allergens, using demo defaults.');
      }

      // 3. THE CHEAT CODE: Ask Groq to act as a strict food scientist
      const prompt = `You are a strict food safety AI for a visually impaired user in Pakistan. 
      The user is allergic to: ${userAllergens.join(', ')}.
      They want to consume: "${productName}".
      
      Does this product typically contain any of their allergens? 
      Respond ONLY in JSON matching this exact format:
      {"isSafe": boolean, "message": "1 short conversational sentence in Roman Urdu explaining why (e.g., 'Yeh aapke liye bilkul safe hai' or 'Ruk jayen, ismein peanut ho sakta hai')"}`;

      logger.info('HEALTH_GUARD', `Checking safety for ${productName} against ${userAllergens.join(', ')}`);

      const response = await fetch(this.GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // Instant model for zero latency in the demo
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1, // Extremely low temp so it doesn't hallucinate safety
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
      
      const data = await response.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      // 4. Format the return object for your UI and Voice Orchestrator
      return {
        isSafe: result.isSafe ?? true,
        reason: result.isSafe ? undefined : 'Allergen Detected',
        message: result.message || (result.isSafe ? "Yeh aapke liye safe lag raha hai." : "Yeh safe nahi lag raha.")
      };

    } catch (error) {
      logger.error('HEALTH_GUARD', 'Safety validation failed', error);
      // Failsafe: If the API crashes, it is SAFER to assume false and warn the user.
      return { 
        isSafe: false, 
        message: "Network masla hai. Please kisi se ingredients check karwa lein." 
      };
    }
  }
}