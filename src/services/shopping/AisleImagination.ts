import { logger } from '@/utils/logger';
import { API_KEYS } from '@/constants/config';
// @ts-ignore
import TtsService from '../voice/TtsService';
import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

// Import the local hardcoded map as the primary source of truth
import storeMap from '../../assets/data/save_mart_pwd_map.json';

/**
 * AisleImagination: The Hybrid Indoor Navigation Engine.
 * Uses local store maps first, and falls back to Groq LLM to heuristically predict 
 * where items are if they aren't explicitly mapped.
 */
export default class AisleImaginationService {
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static navSubscription: EmitterSubscription | null = null;

  /**
   * Initializes the listener for the Voice Orchestrator.
   */
  static init() {
    // 🛠️ FIX: Prevent duplicate listeners which cause TTS echo bugs during live demos
    if (this.navSubscription) {
      logger.info('AISLE_IMAGINATION', 'Indoor Navigation Listener already running.');
      return;
    }

    this.navSubscription = DeviceEventEmitter.addListener('START_INDOOR_NAV', async (productName: string) => {
      await this.guideToProduct(productName);
    });
    logger.info('AISLE_IMAGINATION', 'Indoor Navigation Listener initialized.');
  }

  /**
   * Generates a descriptive 'filling' based on the store map when camera vision is blurry.
   */
  static generateAisleDescription(currentAisleId: string, isLowConfidence: boolean = false) {
    const aisleData = (storeMap as any).aisle_data?.[currentAisleId];

    if (!aisleData) {
      const fallback = "Mujhe aapki location samajh nahi aa rahi. Seedha chaltay rahein.";
      TtsService.speak(fallback);
      return fallback;
    }

    const itemsUr = aisleData.items.map((i: any) => i.ur).join(", ");
    const itemsEn = aisleData.items.map((i: any) => i.en).join(", ");

    if (isLowConfidence) {
      const feedback = `The camera view is unclear, but I am imagining the aisle. You are in ${currentAisleId.replace('_', ' ')}. Is line mein ${itemsUr} rakha hua hai. Aapke left side par products check karein.`;
      TtsService.speak(feedback);
      return feedback;
    }

    const standardFeedback = `Aap ${currentAisleId.replace('_', ' ')} mein hain. Yahan ${itemsEn} maujood hain.`;
    TtsService.speak(standardFeedback);
    return standardFeedback;
  }

  /**
   * Guides the user to a product. Checks local JSON first, falls back to AI.
   */
  static async guideToProduct(productName: string): Promise<void> {
    if (!productName || productName === 'Aage') {
      TtsService.speak("Aisle imagination mode active. Aap seedha chaltay rahein.");
      return;
    }

    // 1. PRIMARY CHECK: Look in the local save_mart_pwd_map.json
    let foundInMap = false;
    let targetAisle = '';

    try {
      const aisleDataObj = (storeMap as any).aisle_data;
      if (aisleDataObj) {
        for (const [aisleId, data] of Object.entries(aisleDataObj)) {
          const items = (data as any).items || [];
          const match = items.find((item: any) => 
            item.en.toLowerCase().includes(productName.toLowerCase()) || 
            item.ur.toLowerCase().includes(productName.toLowerCase())
          );
          
          if (match) {
            foundInMap = true;
            targetAisle = aisleId.replace('_', ' ');
            break;
          }
        }
      }
    } catch (e: any) { // 🛠️ FIX: Strict Mode
      logger.warn('AISLE_IMAGINATION', 'Error parsing local store map', e);
    }

    if (foundInMap) {
      logger.info('AISLE_IMAGINATION', `Found ${productName} locally in ${targetAisle}`);
      TtsService.speak(`Store map ke mutabiq, ${productName} ${targetAisle} mein hai. Uss taraf chalen.`);
      return;
    }

    // 2. FALLBACK: If not in local map, use Groq to "imagine" where it should be
    logger.info('AISLE_IMAGINATION', `${productName} not in local map. Falling back to LLM.`);
    
    try {
      const prompt = `You are the "Aisle Imagination" engine for a visually impaired user navigating a grocery store in Pakistan.
      The user is looking for: "${productName}".
      
      Based on standard grocery store layouts:
      1. Determine which section it is typically found in.
      2. Give ONE simple, general directional instruction in Roman Urdu to guide them there.
      
      CRITICAL: Keep it strictly under 2 sentences. Be helpful but brief.
      
      Respond ONLY with a JSON object matching this schema:
      {"message": "Roman Urdu navigation instruction"}`;

      const response = await fetch(this.GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', 
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.1, 
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
      
      const data = await response.json();
      let result = { message: '' };
      
      // 🛠️ FIX: Wrap JSON parse to prevent crashes from LLM hallucinations
      try {
        result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      } catch (parseError) {
        logger.warn('AISLE_IMAGINATION', 'Groq returned invalid JSON', parseError);
      }
      
      const feedback = result.message || `${productName} shayad aage kisi aisle mein hoga. Aage chalen.`;
      TtsService.speak(feedback);

    } catch (error: any) { // 🛠️ FIX: Strict Mode
      logger.error('AISLE_IMAGINATION', 'Failed to imagine aisle routing', error);
      TtsService.speak("Signal thoda weak hai, aap seedha aage chaltay rahein.");
    }
  }
}