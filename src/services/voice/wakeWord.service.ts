import { SpeechToTextService } from './speechToText.service';
import { VoiceCommandsService } from './voiceCommands.service';
import hapticService from '../common/haptic.service'; // Integrated from consolidated service
import { logger } from '@/src/utils/logger';

/**
 * Seevia Wake Word Service
 * Manages background listening for "Suno Seevia" or "Hey Seevia".
 */
export class WakeWordService {
  private static isListening: boolean = false;
  private static readonly MODULE = 'WAKE_WORD_SERVICE';

  /**
   * Start background listening loop.
   * Optimized for low power consumption using chunked listening.
   */
  static async startListening(onDetected: () => void): Promise<void> {
    if (this.isListening) return;
    
    this.isListening = true;
    logger.info(this.MODULE, '👂 Background wake-word detection active...');

    while (this.isListening) {
      try {
        // Listen in short 3-second intervals to minimize CPU/Battery load
        const result = await SpeechToTextService.listenForCommand(3000); 

        if (result.success && VoiceCommandsService.containsWakeWord(result.text)) {
          logger.info(this.MODULE, '🎤 Wake word detected!');
          
          // Provide instant tactile feedback for PWD users
          await hapticService.success(); 
          
          onDetected();
          break; // Stop background loop to allow full command processing
        }
      } catch (error) {
        logger.error(this.MODULE, 'Detection chunk error', error);
      }

      // 500ms cooldown to prevent thread blocking
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  static stopListening(): void {
    this.isListening = false;
    SpeechToTextService.cancelListening();
    logger.info(this.MODULE, 'Wake-word detection paused.');
  }

  static isCurrentlyListening(): boolean {
    return this.isListening;
  }
}
