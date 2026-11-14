/**
 * TtsService - Alias export for backward compatibility
 * Re-exports TextToSpeechService with simplified interface
 * Supports voice gender, pitch, and speed customization
 */

import { TextToSpeechService } from './textToSpeech.service';

// Export types
export type { VoiceGender, VoicePitch, VoiceSpeed, VoiceSettings } from './textToSpeech.service';

export default {
  speak: (text: string, options?: any) => TextToSpeechService.speak(text, options),
  stop: () => TextToSpeechService.stop(),
  speakFeedback: (type: 'success' | 'error' | 'warning', message: string) =>
    TextToSpeechService.speakFeedback(type, message),
  speakExpiryWarning: (itemName: string, days: number) =>
    TextToSpeechService.speakExpiryWarning(itemName, days),
  speakRomanUrdu: (text: string) => TextToSpeechService.speakRomanUrdu(text),
  speakEnglish: (text: string) => TextToSpeechService.speakEnglish(text),
  isCurrentlySpeaking: () => TextToSpeechService.isCurrentlySpeaking(),
  setVoiceSettings: (settings: any) => TextToSpeechService.setVoiceSettings(settings),
  getVoiceSettings: () => TextToSpeechService.getVoiceSettings(),
  getAvailableVoices: () => TextToSpeechService.getAvailableVoices(),
};
