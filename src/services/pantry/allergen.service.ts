import { PantryItem } from '@/models/PantryItem';
import { logger } from '@/utils/logger';
import { API_KEYS } from '@/constants/config';
import { DeviceEventEmitter } from 'react-native';
// @ts-ignore
import TtsService from '../voice/TtsService';
import { AuthService } from '../firebase/auth.service';
// Import your user profile service to get actual allergies
// import { UserProfileService } from '../profile/userProfile.service'; 

/**
 * Seevia Allergen Service (Demo Edition)
 * Manages allergen detection using offline keyword heuristics and Groq LLM analysis.
 */

export interface AllergenProfile {
  userId: string;
  allergens: string[]; // e.g., ['peanuts', 'dairy', 'gluten']
  severity: 'mild' | 'moderate' | 'severe';
  lastUpdated: Date;
}

export const COMMON_ALLERGENS = [
  'peanuts', 'tree nuts', 'milk/dairy', 'eggs', 'fish',
  'shellfish', 'wheat', 'soy', 'gluten', 'sesame',
  'mustard', 'celery', 'sulfites',
];

export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  'peanuts': ['peanut', 'groundnut', 'monkey nut'],
  'tree nuts': ['almond', 'cashew', 'walnut', 'hazelnut', 'pecan', 'pistachio', 'macadamia'],
  'milk/dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'ghee', 'dairy', 'lactose', 'casein', 'whey'],
  'eggs': ['egg', 'mayonnaise', 'meringue', 'albumen'],
  'fish': ['fish', 'salmon', 'tuna', 'cod', 'anchovy'],
  'shellfish': ['shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'oyster', 'clam'],
  'wheat': ['wheat', 'bread', 'pasta', 'flour', 'roti', 'naan'],
  'soy': ['soy', 'soybean', 'tofu'],
  'gluten': ['gluten', 'barley', 'rye', 'malt'],
  'sesame': ['sesame', 'til', 'tahini'],
  'mustard': ['mustard'],
  'celery': ['celery'],
  'sulfites': ['sulfite', 'sulfur dioxide'],
};

class AllergenServiceImpl {
  private readonly MODULE = 'ALLERGEN_SERVICE';
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  /**
   * Initializes the listener for the Voice Orchestrator.
   * Call allergenService.init() in your GlobalVoiceHandlers.tsx
   */
  init() {
    DeviceEventEmitter.addListener('TRIGGER_ALLERGEN_SCAN', async (productNameOrIngredients: string) => {
      logger.info(this.MODULE, `Voice trigger received for allergen scan: ${productNameOrIngredients}`);
      
      const user = AuthService.getCurrentUser();
      if (!user) {
        TtsService.speak("Aap logged in nahi hain. Safety check fail ho gaya.");
        return;
      }

      try {
        // Load real allergens from user's Firestore profile
        let userAllergens: string[] = [];
        try {
          const { UserProfileService } = await import('../firebase/userProfile.service');
          const profile = await UserProfileService.getUserProfile(user.uid);
          userAllergens = profile?.allergies || [];
        } catch {
          logger.warn(this.MODULE, 'Could not load allergen profile, using defaults');
        }

        // Fallback: use common allergens for demo if profile empty
        if (userAllergens.length === 0) {
          userAllergens = ['peanuts', 'dairy', 'gluten'];
          logger.info(this.MODULE, 'Using demo allergen defaults: peanuts, dairy, gluten');
        }

        const result = await this.verifySafetyWithAI(
          productNameOrIngredients || 'Unknown product',
          userAllergens
        );
        TtsService.speak(result.message);
        // Also emit result for UI screens to show visual feedback
        DeviceEventEmitter.emit('ALLERGEN_RESULT', { ...result, product: productNameOrIngredients });

      } catch (error) {
        TtsService.speak("Network connection weak hai. Main check nahi kar paa rahi.");
      }
    });
    
    logger.info(this.MODULE, 'Allergen Scan Listener initialized.');
  }

  /**
   * Check if an item contains allergens from user's profile (Fast Offline Check)
   */
  checkAllergens(item: PantryItem, userAllergens: string[]): {
    hasAllergens: boolean;
    detectedAllergens: string[];
    severity: 'none' | 'warning' | 'critical';
  } {
    try {
      const detected: string[] = [];
      const itemName = item.name.toLowerCase();
      
      // 🛠️ FIXED: Mapped to 'item.allergies' and explicitly typed as string[]
      const itemAllergyTags: string[] = item.allergies || [];

      userAllergens.forEach(allergen => {
        const allergenic = ALLERGEN_KEYWORDS[allergen] || [];
        
        if (allergenic.some(keyword => itemName.includes(keyword.toLowerCase()))) {
          detected.push(allergen);
        }
        
        // 🛠️ FIXED: Added explicit (tag: string) type
        if (itemAllergyTags.some((tag: string) => tag.toLowerCase().includes(allergen.toLowerCase()))) {
          detected.push(allergen);
        }
      });

      const uniqueDetected = [...new Set(detected)];

      return {
        hasAllergens: uniqueDetected.length > 0,
        detectedAllergens: uniqueDetected,
        severity: uniqueDetected.length > 2 ? 'critical' : uniqueDetected.length > 0 ? 'warning' : 'none',
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to check allergens', error);
      return { hasAllergens: false, detectedAllergens: [], severity: 'none' };
    }
  }

  /**
   * AI-Powered Allergen Detection (The Demo Cheat Code)
   * Uses Groq to analyze complex ingredient lists or product names against the user's specific allergens.
   */
  async verifySafetyWithAI(productNameOrIngredients: string, userAllergens: string[]): Promise<{ isSafe: boolean; message: string }> {
    if (!productNameOrIngredients || userAllergens.length === 0) {
      return { isSafe: true, message: "Aapki profile mein koi allergens nahi hain." };
    }

    const prompt = `You are a strict, highly accurate food safety AI for a visually impaired user in Pakistan.
    The user is allergic to: ${userAllergens.join(', ')}.
    They are scanning this product or ingredient list: "${productNameOrIngredients}".
    
    Does this product typically contain ANY of their allergens, or are there hidden names for these allergens (e.g., whey for dairy)?
    
    Respond ONLY with a JSON object matching this schema:
    {"isSafe": boolean, "message": "1 short, urgent conversational sentence in Roman Urdu explaining the result. E.g., 'Ahtiyat! Is mein peanut hai, yeh safe nahi.' or 'Yeh aapke liye bilkul safe hai.'"}`;

    try {
      const response = await fetch(AllergenServiceImpl.GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1, // Very low temperature for maximum safety/factual accuracy
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
      
      const data = await response.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      return {
        isSafe: result.isSafe ?? false, // Default to false if AI fails parsing
        message: result.message || "Main sure nahi hoon, baraye meharbani kisi aur se check karwa lein."
      };

    } catch (error) {
      logger.error(this.MODULE, 'AI Safety Check Failed', error);
      return { 
        isSafe: false, 
        message: "Internet ka masla hai. Please manually ingredients check kar lein." 
      };
    }
  }

  // --- Retained Utility Methods ---
  
  getSafeItems(items: PantryItem[], userAllergens: string[]): PantryItem[] {
    return items.filter(item => !this.checkAllergens(item, userAllergens).hasAllergens);
  }

  getAllergenicItems(items: PantryItem[], userAllergens: string[]): PantryItem[] {
    return items.filter(item => this.checkAllergens(item, userAllergens).hasAllergens);
  }

  getAllergenWarningForVoice(item: PantryItem, userAllergens: string[]): string | null {
    const check = this.checkAllergens(item, userAllergens);
    if (!check.hasAllergens) return null;

    const allergenList = check.detectedAllergens.join(', ');
    if (check.severity === 'critical') return `AHTIYAT! ${item.name} mein ${allergenList} hai. Ye item use mat karain!`;
    return `Dhyan rakhein. ${item.name} mein ${allergenList} hai.`;
  }

  getAllergenSummaryForVoice(items: PantryItem[], userAllergens: string[]): string {
    const allergenicItems = this.getAllergenicItems(items, userAllergens);
    if (allergenicItems.length === 0) return "Aapke pantry ke tamam items safe hain.";

    const criticalNames = allergenicItems.filter(i => this.checkAllergens(i, userAllergens).severity === 'critical').map(i => i.name).join(', ');
    const warningNames = allergenicItems.filter(i => this.checkAllergens(i, userAllergens).severity === 'warning').map(i => i.name).join(', ');

    let summary = '';
    if (criticalNames) summary += `EMERGENCY: ${criticalNames} khatarnak hain. `;
    if (warningNames) summary += `Ahtiyat: ${warningNames} mein allergens hain.`;
    return summary;
  }
}

export const allergenService = new AllergenServiceImpl();