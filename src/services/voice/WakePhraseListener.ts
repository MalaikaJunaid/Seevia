/**
 * WakePhraseListener - Wrapper for WakeWordService
 * Provides backward-compatible wake word detection
 */

import { WakeWordService } from './wakeWord.service';

export default {
  startListening: (onDetected: () => void) => WakeWordService.startListening(onDetected),
  stopListening: () => WakeWordService.stopListening(),
  isListening: () => WakeWordService.isCurrentlyListening(),
};
