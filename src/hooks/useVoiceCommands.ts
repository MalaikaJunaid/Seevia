import { useCallback, useEffect, useState } from 'react';
import { VoiceCommand, VoiceCommandIntent } from '@/models/voiceCommand';
import { SpeechToTextService } from '@/services/voice/speechToText.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { VoiceCommandsService } from '@/services/voice/voiceCommands.service';
import { useAccessibility } from './useAccessibility';
import { ERROR_MESSAGES } from '@/constants/config';
import { logger } from '@/utils/logger';

export type ConversationState = 'IDLE' | 'CONFIRM_DELETE' | 'CONFIRM_ADD' | 'ASK_CATEGORY';

export function useVoiceCommands() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // AI Memory State
  const [dialogState, setDialogState] = useState<ConversationState>('IDLE');
  const [pendingContext, setPendingContext] = useState<any>(null);

  const { triggerHapticFeedback } = useAccessibility();

  useEffect(() => {
    return () => {
      SpeechToTextService.cancelListening();
      TextToSpeechService.stop();
    };
  }, []);

  // Updated to default to 'ur' (Urdu)
  const speak = useCallback(async (text: string, language: 'en' | 'ur' = 'ur') => {
    try {
      setIsSpeaking(true);
      setError(null);
      // If you are using romanUrduTTSService directly in production, you can swap TextToSpeechService here!
      await TextToSpeechService.speak(text); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      await triggerHapticFeedback('heavy'); 
      setIsListening(true);
      
      const result = await SpeechToTextService.listenForCommand();
      
      if (result.success && result.text) {
        const spokenText = result.text.toLowerCase();
        setTranscript(spokenText);
        
        // --- CONVERSATIONAL STATE MACHINE ---
        if (dialogState !== 'IDLE') {
          const isYes = /yes|yeah|yep|haan|ji|ha|bilkul/i.test(spokenText);
          const isNo = /no|nope|nahi|na/i.test(spokenText);

          if (isYes || isNo) {
            await triggerHapticFeedback('success');
            const resolvedCommand: VoiceCommand = {
              intent: isYes ? VoiceCommandIntent.CONFIRM_YES : VoiceCommandIntent.CONFIRM_NO,
              confidence: 1.0,
              rawText: spokenText,
              timestamp: Date.now(),
              entities: pendingContext
            };
            setLastCommand(resolvedCommand);
            
            setDialogState('IDLE');
            setPendingContext(null);
            return resolvedCommand;
          } else {
            // Urdu Fallback for invalid Yes/No
            await speak("Maaf kijiyega, mujhe samajh nahi aaya. Barae meharbani Haan ya Nahi mein jawab dein.");
            return null;
          }
        }

        // --- NORMAL INTENT PARSING ---
        const command = VoiceCommandsService.parseCommand(result.text);
        setLastCommand(command);
        await triggerHapticFeedback('success');
        return command;

      } else {
        setError(result.error || ERROR_MESSAGES.VOICE_NOT_RECOGNIZED);
        return null;
      }
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.FIREBASE_ERROR);
      return null;
    } finally {
      setIsListening(false);
    }
  }, [triggerHapticFeedback, dialogState, pendingContext, speak]);

  const stopListening = useCallback(async () => {
    await SpeechToTextService.cancelListening();
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(async () => {
    await TextToSpeechService.stop();
    setIsSpeaking(false);
  }, []);

  const askForConfirmation = useCallback(async (state: ConversationState, contextData: any, promptText: string) => {
    setDialogState(state);
    setPendingContext(contextData);
    await speak(promptText);
  }, [speak]);

  return {
    isListening,
    isSpeaking,
    lastCommand,
    transcript,
    error,
    dialogState,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    askForConfirmation,
  };
}