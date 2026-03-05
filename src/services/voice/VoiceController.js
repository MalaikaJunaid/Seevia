import AudioRecorder from './AudioRecorder';
import SttService from './SttService';
import IntentEngine from './IntentEngine';
import TtsService from './TtsService';
import SceneImagination from './SceneImagination';
import WakePhraseListener from './WakePhraseListener';

export default class VoiceController {
  constructor() {
    this.recorder = new AudioRecorder();
  }

  // 1. Initialize the proactive listener
  async initSeevia() {
    await this.recorder.requestPermissions();
    
    // Start listening for "Hey Seevia"
    WakePhraseListener.startListening(() => this.startInteraction());
  }

  // 2. The Core Pipeline Loop
  async startInteraction() {
    TtsService.speak("Ji, I am listening."); // Auditory cue for the user

    // Step A: Record User Voice
    await this.recorder.startRecording();
    setTimeout(async () => {
      const audioUri = await this.recorder.stopRecording();

      // Step B: Speech to Text (Bilingual)
      const transcribedText = await SttService.transcribe(audioUri);
      if (!transcribedText) return;

      // Step C: Intent Classification (The Brain)
      const prediction = await IntentEngine.classify(transcribedText);

      // Step D: Decision Logic (Imagination vs. Action)
      // Example: If user asks "Where am I?" and vision is low confidence
      if (prediction.label === "describe_scene") {
        const feedback = SceneImagination.imagine("Aisle_4_B", true); // Pass camera blur status here
        TtsService.speak(feedback);
      } else {
        TtsService.speak(`Executing ${prediction.label.replace('_', ' ')}.`);
      }
      
    }, 4000); // Record for 4 seconds
  }
}
