import { SpeechService } from '../common/speech.service';
import { VoiceService } from './voice.service';

export const ConversationService = {
  // 1. Start the chat
  start: async () => {
    await SpeechService.speak("Assalam-o-Alaikum! Seevia active hai. Main aapki kya madad kar sakti hoon?");
    // Automatically start listening after speaking
    await VoiceService.startListening();
  },

  // 2. Handle a scan result conversationally
  handleScanResult: async (itemName: string, isSafe: boolean) => {
    const status = isSafe ? "Ye mahfooz hai." : "Khabardar! Is mein allergy ho sakti hai.";
    const prompt = `Maine ${itemName} pehchana hai. ${status} Kya main isay pantry mein save kar loon?`;
    
    await SpeechService.speak(prompt);
  }
};
