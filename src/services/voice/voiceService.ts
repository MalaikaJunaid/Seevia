import * as Speech from 'expo-speech';
import hapticService from '../common/haptic.service';
import { WakeWordService } from './wakeWord.service';
import { logger } from '@/src/utils/logger';

export type VoiceIntent =
  | { type: 'add_pantry'; item: string }
  | { type: 'scan_product' }
  | { type: 'emergency_sos' }
  | { type: 'open_module'; module: 'pantry' | 'shopping' | 'volunteer' | 'profile' }
  | { type: 'describe_scene'; location: string }
  | { type: 'navigate'; direction: 'next' | 'previous' | 'home' }
  | { type: 'unknown' };

class VoiceServiceImpl {
  private readonly MODULE = 'VOICE_SERVICE';
  private isListening = false;
  private language: string = 'en-US'; // Set to 'ur-PK' for Urdu support

  /**
   * 1. Initialize Seevia (Refined from VoiceController.js)
   * Starts the background "Suno Seevia" listener.
   */
  async initSeevia(): Promise<void> {
    logger.info(this.MODULE, "Initializing Proactive Voice Listener...");
    
    // Start listening for the wake phrase
    await WakeWordService.startListening(() => {
      this.handleWakeWordDetected();
    });
  }

  /**
   * 2. The Core Pipeline (The Loop from VoiceController.js)
   */
  private async handleWakeWordDetected(): Promise<void> {
    if (this.isListening) return;
    this.isListening = true;

    try {
      // Step A: Auditory & Haptic Cue (Bilingual support for Pakistan market)
      const prompt = this.language === 'ur-PK' ? "Ji, main sun rahi hoon." : "I am listening.";
      await hapticService.success();
      await this.speak(prompt, { rate: 0.9 });

      // Step B: Mock/Actual Speech Recognition
      const recognizedText = await this.mockRecognizeSpeech();
      if (!recognizedText) throw new Error("No speech detected");

      // Step C: Intent Parsing (The Brain)
      const intent = this.parseIntent(recognizedText);

      // Step D: Execute and Provide Feedback
      await this.provideIntentFeedback(intent);
      
    } catch (err) {
      logger.error(this.MODULE, "Interaction Loop Error", err);
      await hapticService.error();
    } finally {
      this.isListening = false;
      // Restart the wake-word listener
      this.initSeevia();
    }
  }

  private parseIntent(command: string): VoiceIntent {
    const cmd = command.toLowerCase();

    // Logic for "Describe Scene" from your VoiceController.js
    if (cmd.includes('where am i') || cmd.includes('describe')) {
      return { type: 'describe_scene', location: 'Current_Aisle' };
    }

    if (cmd.includes('add')) {
      const match = cmd.match(/add\s+(.+?)(?:\s+to\s+pantry|$)/i);
      return { type: 'add_pantry', item: match?.[1] ?? 'unknown' };
    }

    if (cmd.includes('help') || cmd.includes('sos')) return { type: 'emergency_sos' };
    
    return { type: 'unknown' };
  }

  private async provideIntentFeedback(intent: VoiceIntent): Promise<void> {
    let feedback = "";

    switch (intent.type) {
      case 'describe_scene':
        // Integrated from SceneImagination.js logic
        feedback = "You are in the snacks aisle. There are chips on your left.";
        break;
      case 'add_pantry':
        feedback = `Adding ${intent.item} to your pantry.`;
        await hapticService.medium();
        break;
      case 'emergency_sos':
        feedback = "Emergency protocol activated. Notifying your trust circle.";
        await hapticService.sosHeartbeat();
        break;
      default:
        feedback = "I didn't catch that. Please say it again.";
    }

    await this.speak(feedback);
  }

  async speak(text: string, opts?: Speech.SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        ...opts,
        language: this.language,
        onDone: () => resolve(),
      });
    });
  }

  setLanguage(lang: 'en-US' | 'ur-PK'): void {
    this.language = lang;
  }
  
  private async mockRecognizeSpeech(): Promise<string> {
    return new Promise(resolve => setTimeout(() => resolve("add milk"), 2000));
  }
}

export const voiceService = new VoiceServiceImpl();
