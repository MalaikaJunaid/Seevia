import { logger } from '@/utils/logger';

/**
 * WakeWordService
 * Currently DISABLED to ensure 100% microphone stability for manual voice commands.
 * Background continuous listening in Expo Go conflicts with Groq Whisper's manual triggers.
 */
class WakeWordService {
  private readonly MODULE = 'WAKE_WORD_SERVICE';
  private isListening: boolean = false;

  /**
   * We intentionally make this a "No-Op" (No Operation) function.
   * It logs that it was called, but immediately returns without starting the mic.
   */
  startListening(onWakeWordDetected?: () => void) {
    if (this.isListening) return;
    
    this.isListening = true;
    logger.info(
      this.MODULE, 
      '🛑 Background listening is PERMANENTLY DISABLED to prioritize the manual mic button.'
    );
    
    // We return immediately. No Audio.Recording is created. No loop is started.
    return; 
  }

  /**
   * Safely do nothing since we never started listening.
   */
  stopListening() {
    if (!this.isListening) return;
    
    this.isListening = false;
    logger.info(this.MODULE, 'Background listening stopped (was already disabled).');
  }
}

export const wakeWordService = new WakeWordService();