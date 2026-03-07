import * as Speech from 'expo-speech';
import { APP_CONFIG } from '@/src/constants/config';
import hapticService from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Text-to-Speech (TTS) Service
 * Provides auditory and tactile feedback for hands-free operation.
 */
export class TextToSpeechService {
  private static readonly MODULE = 'TTS_SERVICE';
  private static isSpeaking: boolean = false;

  /**
   * Speak text aloud with synchronized haptics
   */
  static async speak(text: string, options?: Speech.SpeechOptions): Promise<void> {
    try {
      await this.stop(); // Clear previous speech

      this.isSpeaking = true;
      logger.info(this.MODULE, `Speaking: ${text}`);

      await Speech.speak(text, {
        language: options?.language || APP_CONFIG.DEFAULT_LANGUAGE || 'en-US',
        pitch: options?.pitch || APP_CONFIG.TTS_PITCH || 1.0,
        rate: options?.rate || APP_CONFIG.TTS_RATE || 0.9, // Slower for clarity
        onDone: () => { this.isSpeaking = false; },
        onError: (err) => {
          logger.error(this.MODULE, 'Speech failed', err);
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      logger.error(this.MODULE, 'Error in speak method', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Stops all ongoing speech and haptics
   */
  static async stop(): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
    }
  }

  /**
   * Combined Sensory Feedback: Voice + Haptics
   */
  static async speakFeedback(type: 'success' | 'error' | 'warning', message: string): Promise<void> {
    // 1. Trigger Vibration
    await hapticService.trigger(type);
    
    // 2. Speak Message
    const prefix = type === 'error' ? 'Alert: ' : '';
    await this.speak(`${prefix}${message}`);
  }

  /**
   * Specialized Pantry Feedback
   */
  static async speakExpiryWarning(itemName: string, days: number): Promise<void> {
    const message = days === 0 
      ? `${itemName} has expired.` 
      : `${itemName} will expire in ${days} days.`;
    
    await this.speakFeedback(days <= 1 ? 'warning' : 'success', message);
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
