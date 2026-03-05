import * as Speech from 'expo-speech';

/**
 * TtsService.js: Handles auditory feedback for Seevia.
 * Provides the voice interface for navigation, pantry checks, and safety alerts.
 */
export default class TtsService {
  /**
   * Speaks the provided text to the user.
   * @param {string} text - The message to be spoken.
   * @param {string} language - Defaulting to 'en' (English), but can handle 'ur' (Urdu).
   */
  static speak(text, language = 'en') {
    try {
      console.log('Seevia is speaking:', text);

      const options = {
        language: language,
        pitch: 1.0,  // Affective AI: Can be modulated based on user profile settings [cite: 5, 45]
        rate: 0.9,   // Slightly slower for better clarity for the visually impaired
        onStart: () => console.log('Speech started'),
        onDone: () => console.log('Speech finished'),
        onError: (error) => console.error('Speech error:', error),
      };

      Speech.speak(text, options);
    } catch (error) {
      console.error('TtsService failed:', error);
    }
  }

  /**
   * Stops any ongoing speech immediately.
   * Useful for emergency interrupts or new urgent commands.
   */
  static stop() {
    Speech.stop();
  }
}
