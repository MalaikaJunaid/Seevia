/**
 * Seevia Intent Classification Service
 * Implements Multi-Tier AI Fallback: HuggingFace (Primary) -> Groq (Fallback)
 */

import { API_KEYS } from '@/constants/config';
import { logger } from '@/utils/logger';

export type SeeviaIntent =
  | 'add_item' | 'remove_item' | 'update_pantry'
  | 'check_allergen' | 'check_stock' | 'check_expiry'
  | 'show_shopping_list' | 'shop_from_list'
  | 'navigate_external' | 'navigate_internal' | 'find_product'
  | 'identify_product' | 'describe_scene' | 'detect_danger' | 'identify_color'
  | 'walking_mode' | 'start_walking'
  | 'emergency_sos' | 'call_caregiver' | 'call_volunteer'
  | 'theek_hoon' | 'cancel_sos'
  | 'set_haptics'
  | 'update_medication' | 'check_medication_reminder'
  | 'logout' | 'ask_ai' | 'unknown';

export interface IntentResult {
  intent: SeeviaIntent;
  confidence: number;
  entities: Record<string, any>;
  provider: 'local' | 'huggingface' | 'groq';
}

class IntentEngineService {
  private static readonly MODULE = 'INTENT_ENGINE';
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static readonly HF_API_URL = 'https://api-inference.huggingface.co/models/malaikajunaid/seevia-intent-distilbert';
  
  // 🛠️ DEMO FIX: Strict timeout for Hugging Face cold starts
  private static readonly HF_TIMEOUT_MS = 2500; 

  /**
   * Main orchestrator for intent classification using the Fallback Chain
   */
  static async classify(text: string): Promise<IntentResult> {
    logger.info(this.MODULE, `Starting classification pipeline for: "${text}"`);
    
    try {
      // TIER 1: Try Custom Hugging Face Model First
      const hfResult = await this.classifyHuggingFace(text);
      
      // Confidence Threshold Check defined in architecture
      if (hfResult && hfResult.confidence > 0.50) {
        logger.info(this.MODULE, `HF Success: ${hfResult.intent} (${hfResult.confidence})`);
        return hfResult;
      } else {
        logger.info(this.MODULE, 'HF confidence too low, falling back to Groq');
      }
    } catch (error) {
      logger.warn(this.MODULE, 'Hugging Face failed or timed out. Failing over to Groq.');
    }

    // TIER 2: Fallback to Groq Llama 3.1
    try {
      return await this.classifyGroq(text);
    } catch (error) {
      logger.error(this.MODULE, 'Groq classification failed', error);
      return { intent: 'unknown', confidence: 0.0, entities: {}, provider: 'groq' };
    }
  }

  /**
   * TIER 1: Primary Inference (Hugging Face)
   */
  private static async classifyHuggingFace(text: string): Promise<IntentResult | null> {
    if (!API_KEYS.HUGGINGFACE) {
        logger.warn(this.MODULE, 'HuggingFace token missing. Skipping tier.');
        return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.HF_TIMEOUT_MS);

    const response = await fetch(this.HF_API_URL, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${API_KEYS.HUGGINGFACE}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: text }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HF API error: ${response.status}`);
    
    const result = await response.json();

    if (result && result.length > 0) {
      const topIntent = result[0].reduce((prev: any, current: any) => 
        (prev.score > current.score) ? prev : current
      );
      
      return {
        // Normalizes whatever string your custom model returns into the SeeviaIntent type
        intent: this.normalizeIntentMapping(topIntent.label),
        confidence: topIntent.score,
        entities: {}, // DistilBERT classification usually doesn't extract entities
        provider: 'huggingface'
      };
    }
    
    return null;
  }

  /**
   * TIER 2: Fallback Inference (Groq 70B)
   */
  private static async classifyGroq(text: string): Promise<IntentResult> {
    if (!API_KEYS.GROQ) throw new Error('Groq API key not configured');

    const systemPrompt = `You are the Omni-Brain Intent Engine for Seevia, an assistive app for the visually impaired.
Classify the user's command into one of these exact intents. The user will speak in English, Roman Urdu, or a mix.

# INVENTORY & SHOPPING
- add_item / remove_item / update_pantry
- check_stock: e.g., "kya khatam ho raha hai", "low stock"
- check_expiry: e.g., "kya kharab hone wala hai", "expired stuff"
- show_shopping_list: e.g., "shop list dikhao"
- shop_from_list: e.g., "list ke hisaab se shopping karao"

# SAFETY & HEALTH
- check_allergen: e.g., "kya yeh mere liye safe hai", "allergies check karo"
- update_medication: e.g., "dawai update kardo"
- check_medication_reminder: e.g., "aaj dawai khayi hai maine?"

# NAVIGATION & VISION
- navigate_external: e.g., "take me to XYZ store", "Giga Mall ka rasta batao" (Extract entity: "location")
- navigate_internal: e.g., "store mein navigate karao", "andar rasta batao"
- find_product: e.g., "XYZ kahan milega aisle mein" (Extract entity: "product")
- identify_product: e.g., "yeh kya cheez hai"
- describe_scene: e.g., "samne kya hai", "dekh kar batao"
- identify_color: e.g., "is dress ka color kya hai"
- detect_danger: e.g., "samne koi pathar ya khadda toh nahi", "is it safe to walk"

# EMERGENCY & ACCESSIBILITY
- emergency_sos: e.g., "bachao", "emergency", "madad chahiye"
- theek_hoon: e.g., "theek hoon", "main theek hoon", "cancel karo", "sab theek hai" (cancel fall alert)
- cancel_sos: e.g., "cancel emergency", "mujhe madad nahi chahiye"
- call_caregiver: e.g., "caretaker ko phone milao"
- call_volunteer: e.g., "kisi volunteer se connect karo"
- walking_mode: e.g., "walking mode on", "camera se rasta dikhao", "chalta hoon help karo"
- set_haptics: e.g., "haptics mode on karo"
- logout: e.g., "log me out"
- ask_ai: General conversational questions not fitting above. (Extract entity: "query")

CRITICAL: Return ONLY raw JSON matching this schema:
{"intent": "exact_intent_name", "confidence": 0.95, "entities": {"product": "extracted_if_any", "location": "extracted_if_any", "query": "extracted_if_any"}}`;

    // Models in preference order — llama-3.1-70b-versatile was deprecated
    const models = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama3-70b-8192'];

    for (const model of models) {
      try {
        logger.info(this.MODULE, `Querying Groq [${model}] for intent classification`);
        const response = await fetch(this.GROQ_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${API_KEYS.GROQ}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
            temperature: 0.0,
            response_format: { type: 'json_object' },
            max_tokens: 150,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.warn(this.MODULE, `Groq [${model}] HTTP ${response.status}: ${errText.substring(0, 100)}`);
          continue; // try next model
        }

        const data = await response.json();
        const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        return {
          intent: result.intent || 'unknown',
          confidence: result.confidence || 0,
          entities: result.entities || {},
          provider: 'groq',
        };
      } catch (e: any) {
        logger.warn(this.MODULE, `Groq [${model}] threw: ${e.message}`);
      }
    }

    throw new Error('All Groq models failed for intent classification');
  }

  // 🛠️ THE GUARDRAILED CONVERSATIONAL ENGINE
  static async generateConversationalResponse(userQuery: string, pantryContext?: string[]): Promise<string> {
    if (!API_KEYS.GROQ) throw new Error('Groq API key not configured');

    let pantryInfo = '';
    if (pantryContext && pantryContext.length > 0) {
      pantryInfo = `The user currently has these items in their pantry: ${pantryContext.join(', ')}.`;
    } else {
      pantryInfo = `The user's pantry is currently empty.`;
    }

    const conversationalPrompt = `You are Seevia, a highly practical, concise, and safety-focused AI assistant for a visually impaired user in Pakistan.

${pantryInfo}

CRITICAL RULES (STRICTLY ENFORCED):
1. EXTREME BREVITY: Your answer MUST be 1 or 2 sentences maximum. Visually impaired users rely on audio; do not block their audio channel with long speeches.
2. NO PHILOSOPHY: Do NOT offer life coaching, motivational speeches, or talk about "dreams" or "destiny". Keep it strictly factual and practical.
3. DOMAIN STRICTNESS: You only help with food, pantry items, recipes, object scanning, and app navigation. If the user says something totally unrelated, say exactly: "Main sirf pantry aur app features mein madad kar sakti hoon."
4. NO HALLUCINATION: If suggesting a recipe, ONLY use the items listed in their pantry. Do not invent ingredients.
5. EMERGENCY SAFETY: If the user sounds scared, in pain, confused, or mentions a critical situation, drop everything and say exactly: "Agar aapko madad chahiye toh 'Emergency' bolein."
6. LANGUAGE: Respond in friendly, simple Roman Urdu.

User Query: "${userQuery}"`;

    try {
      const response = await fetch(this.GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', 
          messages: [
            { role: 'system', content: conversationalPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.2, 
        }),
      });

      if (!response.ok) throw new Error(`Groq API error`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Maazrat, main samajh nahi payi.';
    } catch (error) {
      logger.error(this.MODULE, 'Conversational AI failed', error);
      return 'Network ka masla hai, main abhi jawab nahi de paa rahi.';
    }
  }

  /**
   * Helper to safely map raw HuggingFace labels to SeeviaIntent schema
   */
  private static normalizeIntentMapping(rawLabel: string): SeeviaIntent {
    const label = rawLabel.toLowerCase().trim();
    
    // Check if the label perfectly matches a valid SeeviaIntent
    const validIntents: SeeviaIntent[] = [
      'add_item', 'remove_item', 'update_pantry', 'check_allergen', 'check_stock', 'check_expiry',
      'show_shopping_list', 'shop_from_list', 'navigate_external', 'navigate_internal', 'find_product',
      'identify_product', 'describe_scene', 'detect_danger', 'identify_color', 'emergency_sos',
      'call_caregiver', 'call_volunteer', 'set_haptics', 'update_medication', 'check_medication_reminder',
      'logout', 'ask_ai', 'unknown'
    ];
    
    if (validIntents.includes(label as SeeviaIntent)) {
        return label as SeeviaIntent;
    }

    // Fallback mappings if your HF model outputs different labels (e.g. 'start_navigation' -> 'navigate_internal')
    const mappings: Record<string, SeeviaIntent> = {
      'start_navigation': 'navigate_internal',
      'help': 'emergency_sos',
      'scan': 'identify_product',
      // Add more mappings here if your trained model uses different labels
    };

    return mappings[label] || 'unknown';
  }
}

export default IntentEngineService;