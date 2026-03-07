import { VOICE_COMMAND_PATTERNS, WAKE_WORDS } from '@/src/constants/commands';
import { VoiceCommand, VoiceCommandIntent } from '@/src/models/VoiceCommand';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Voice Command Parser
 * Responsible for turning raw strings into structured Intents and Entities.
 */
export class VoiceCommandsService {
  private static readonly MODULE = 'VOICE_COMMANDS_SERVICE';

  /**
   * Parses spoken text into a structured VoiceCommand object.
   */
  static parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase().trim();
    let cleanText = lowerText;

    // 1. Strip Wake Words ("Hey Seevia", "Suno Seevia")
    for (const wakeWord of WAKE_WORDS) {
      if (cleanText.startsWith(wakeWord)) {
        cleanText = cleanText.replace(wakeWord, '').trim();
        break;
      }
    }

    // 2. Pattern Matching Loop
    for (const pattern of VOICE_COMMAND_PATTERNS) {
      for (const patternStr of pattern.patterns) {
        // Create regex that matches the start of the string
        const regex = new RegExp(`^${patternStr}$`, 'i');
        const match = cleanText.match(regex);

        if (match) {
          const entities: Record<string, string> = {};
          
          // 3. Entity Extraction from Regex Capture Groups
          if (match.length > 1 && pattern.requiresEntities) {
            pattern.requiresEntities.forEach((entityName, index) => {
              if (match[index + 1]) {
                entities[entityName] = match[index + 1].trim();
              }
            });
          }

          logger.info(this.MODULE, `Parsed Intent: ${pattern.intent}`);
          
          return {
            intent: pattern.intent as VoiceCommandIntent,
            confidence: 0.95,
            entities: Object.keys(entities).length > 0 ? entities : undefined,
            rawText: text,
          };
        }
      }
    }

    // Fallback if no patterns match
    return {
      intent: VoiceCommandIntent.UNKNOWN,
      confidence: 0.0,
      rawText: text,
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
