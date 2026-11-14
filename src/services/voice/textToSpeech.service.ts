import * as Speech from 'expo-speech';
import { logger } from '@/utils/logger';

class TextToSpeechServiceImpl {
  private readonly MODULE = 'TTS_SERVICE';
  private defaultLanguage = 'ur-PK'; 
  private defaultRate = 0.9; 
  private defaultPitch = 1.0;

  async speak(text: string, options?: Speech.SpeechOptions): Promise<void> {
    try {
      logger.info(this.MODULE, `Speaking: ${text}`);
      
      await this.stop();

      Speech.speak(text, {
        language: this.defaultLanguage,
        rate: this.defaultRate,
        pitch: this.defaultPitch,
        ...options,
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to execute speech', error);
    }
  }

  async stop(): Promise<void> {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to stop speech', error);
    }
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      return false;
    }
  }
}

export const TextToSpeechService = new TextToSpeechServiceImpl();