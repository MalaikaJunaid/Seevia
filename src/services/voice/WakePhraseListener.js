/**
 * WakePhraseListener.js: Hands-free "Hey Seevia" activation.
 * Integrated for Module 2 Proactive interaction.
 */

import { Audio } from 'expo-av';
// In a full implementation, you would use @picovoice/porcupine-react-native
// This logic demonstrates the bridge to your existing AudioRecorder.

export default class WakePhraseListener {
  static async startListening(onWake) {
    try {
      console.log("Seevia is listening for wake phrase...");
      
      // 1. Initialize low-power background audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // 2. Logic to detect 'Hey Seevia'
      // Once keyword is detected, execute the callback
      // This is the trigger that starts the full STT -> NLU pipeline
      if (keywordDetected) {
         onWake(); 
      }
    } catch (error) {
      console.error("WakePhrase error:", error);
    }
  }
}
