import { useCallback, useEffect, useState } from 'react';
import { VoiceCommand } from '@/src/models/VoiceCommand';
import { SpeechToTextService } from '@/src/services/voice/speechToText.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { VoiceCommandsService } from '@/src/services/voice/voiceCommands.service';
import { useAccessibility } from './useAccessibility';
import { ERROR_MESSAGES } from '@/src/constants/config';

/**
 * Seevia Voice Interaction Hook
 * Orchestrates STT, Command Parsing, and TTS feedback with Haptic confirmation.
 */
export function useVoiceCommands() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { triggerHapticFeedback } = useAccessibility();

  useEffect(() => {
    // Cleanup services on unmount to prevent memory leaks or stuck audio sessions
    return () => {
      SpeechToTextService.cancelListening();
      TextToSpeechService.stop();
    };
  }, []);

  /**
   * Triggers the microphone to listen for a user command.
   * Includes haptic start/stop cues for PWD accessibility.
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      await triggerHapticFeedback('heavy'); // Tactile cue: "I am listening"
      setIsListening(true);
      
      const result = await SpeechToTextService.listenForCommand();
      
      if (result.success && result.text) {
        setTranscript(result.text);
        const command = VoiceCommandsService.parseCommand(result.text);
        setLastCommand(command);
        
        await triggerHapticFeedback('success'); // Tactile cue: "Command understood"
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
  }, [triggerHapticFeedback]);

  const stopListening = useCallback(async () => {
    await SpeechToTextService.cancelListening();
    setIsListening(false);
  }, []);

  /**
   * Accessible TTS wrapper.
   */
  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      setError(null);
      await TextToSpeechService.speak(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(async () => {
    await TextToSpeechService.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    lastCommand,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
