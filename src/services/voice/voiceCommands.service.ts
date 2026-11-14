/**
 * Seevia Voice Command Parser
 * Responsible for turning raw strings into structured Intents and Entities.
 *
 * Processing Pipeline:
 * 1. Local pattern matching (fastest, < 50ms)
 * 2. HuggingFace intent classifier (medium, 200-500ms)
 * 3. Groq Llama 3.1 (fallback, highest accuracy)
 */

import { VOICE_COMMAND_PATTERNS, WAKE_WORDS } from '@/constants/commands';
import { VoiceCommand, VoiceCommandIntent } from '@/models';
import { logger } from '@/utils/logger';
import { aiFallbackService } from '../ai/aiFallback.service';

export class VoiceCommandsService {
  private static readonly MODULE = 'VOICE_COMMANDS_SERVICE';
  private static readonly LOCAL_CONFIDENCE_THRESHOLD = 0.75;

  /**
   * Map AI fallback service intent names to VoiceCommandIntent enum
   */
  private static mapIntentName(intentName: string): VoiceCommandIntent {
    const intentMap: Record<string, VoiceCommandIntent> = {
      'navigate_home': VoiceCommandIntent.NAVIGATE_HOME,
      'navigate_pantry': VoiceCommandIntent.NAVIGATE_PANTRY,
      'navigate_shopping': VoiceCommandIntent.NAVIGATE_SHOPPING,
      'navigate_emergency': VoiceCommandIntent.NAVIGATE_EMERGENCY,
      'add_item': VoiceCommandIntent.ADD_ITEM,
      'remove_item': VoiceCommandIntent.REMOVE_ITEM,
      'identify_product': VoiceCommandIntent.IDENTIFY_PRODUCT,
      'read_text': VoiceCommandIntent.READ_TEXT,
      'emergency': VoiceCommandIntent.ACTIVATE_SOS,
      'describe_scene': VoiceCommandIntent.DESCRIBE_SCENE,
    };
    return intentMap[intentName] || VoiceCommandIntent.UNKNOWN;
  }

  /**
   * Parses spoken text into a structured VoiceCommand object.
   * Uses multi-tier fallback: Local → HuggingFace → Groq
   */
  static async parseCommandAsync(text: string): Promise<VoiceCommand> {
    const lowerText = text.toLowerCase().trim();
    let cleanText = lowerText;

    // 1. Strip Wake Words ("Hey Seevia", "Suno Seevia")
    for (const wakeWord of WAKE_WORDS) {
      if (cleanText.startsWith(wakeWord)) {
        cleanText = cleanText.replace(wakeWord, '').trim();
        break;
      }
    }

    // 2. Local Pattern Matching (Tier 1 - Fastest)
    const localResult = this.parseLocal(cleanText);
    if (localResult.confidence >= this.LOCAL_CONFIDENCE_THRESHOLD) {
      logger.info(this.MODULE, `Local intent: ${localResult.intent} (${localResult.confidence.toFixed(2)})`);
      return {
        ...localResult,
        rawText: text,
        timestamp: Date.now(),
      };
    }

    // 3. AI Fallback (Tier 2 & 3)
    logger.info(this.MODULE, `Local confidence low (${localResult.confidence.toFixed(2)}), using AI fallback`);

    const aiResult = await aiFallbackService.classifyIntent(cleanText, 'en');

    if (aiResult.success && aiResult.confidence > localResult.confidence) {
      return {
        intent: this.mapIntentName(aiResult.data.intent),
        confidence: aiResult.confidence,
        entities: aiResult.data.entities,
        rawText: text,
        timestamp: Date.now(),
        provider: aiResult.provider as 'deepgram' | 'whisper' | 'expo' | 'local' | 'offline',
      };
    }

    // Return local result if AI didn't improve
    return {
      ...localResult,
      rawText: text,
      timestamp: Date.now(),
    };
  }

  /**
   * Synchronous local parsing (for backward compatibility)
   */
  static parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase().trim();
    let cleanText = lowerText;

    for (const wakeWord of WAKE_WORDS) {
      if (cleanText.startsWith(wakeWord)) {
        cleanText = cleanText.replace(wakeWord, '').trim();
        break;
      }
    }

    const result = this.parseLocal(cleanText);
    return {
      ...result,
      rawText: text,
      timestamp: Date.now(),
    };
  }

  /**
   * Local pattern matching only
   */
  private static parseLocal(cleanText: string): Omit<VoiceCommand, 'rawText' | 'timestamp'> {
    for (const pattern of VOICE_COMMAND_PATTERNS) {
      for (const patternStr of pattern.patterns) {
        const regex = new RegExp(`^${patternStr}$`, 'i');
        const match = cleanText.match(regex);

        if (match) {
          const entities: Record<string, string> = {};

          if (match.length > 1 && pattern.requiresEntities) {
            pattern.requiresEntities.forEach((entityName, index) => {
              if (match[index + 1]) {
                entities[entityName] = match[index + 1].trim();
              }
            });
          }

          return {
            intent: pattern.intent,
            confidence: 0.95,
            entities: Object.keys(entities).length > 0 ? entities : undefined,
          };
        }
      }
    }

    return {
      intent: VoiceCommandIntent.UNKNOWN,
      confidence: 0.0,
    };
  }

  /**
   * Quick check to see if a string contains the wake phrase.
   */
  static containsWakeWord(text: string): boolean {
    const lowerText = text.toLowerCase();
    return WAKE_WORDS.some((wakeWord) => lowerText.includes(wakeWord.toLowerCase()));
  }

  /**
   * Utility: Extract quantity and item name separately.
   * "Add 3 loaves of bread" -> { quantity: 3, text: "loaves of bread" }
   */
  static extractQuantity(text: string): { quantity: number; text: string } {
    const quantityMatch = text.match(/^(\d+)\s+(.+)$/);
    if (quantityMatch) {
      return {
        quantity: parseInt(quantityMatch[1], 10),
        text: quantityMatch[2].trim(),
      };
    }
    return { quantity: 1, text: text.trim() };
  }
}
