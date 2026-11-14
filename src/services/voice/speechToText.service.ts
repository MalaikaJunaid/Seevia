import { Audio } from 'expo-av';
import { APP_CONFIG, API_KEYS, ERROR_MESSAGES } from '@/constants/config';
import { hapticService } from '@/services/common/haptic.service';
import { logger } from '@/utils/logger';

export interface SpeechRecognitionResult {
  success: boolean;
  text: string;
  confidence?: number;
  error?: string;
}

/**
 * Seevia Speech-to-Text (STT) Service
 * Manages native microphone recording. Defaults to Groq (Whisper) for blazing fast, 
 * free transcription. Falls back to OpenAI if needed.
 */
export class SpeechToTextService {
  private static recording: Audio.Recording | null = null;
  private static isListening: boolean = false;
  private static readonly MODULE = 'STT_SERVICE';
  
  private static isGroqConfigured(): boolean {
    return !!API_KEYS.GROQ && API_KEYS.GROQ.length > 0;
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error(this.MODULE, 'Mic permission error', error);
      return false;
    }
  }

  static async startListening(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) throw new Error(ERROR_MESSAGES.MIC_PERMISSION);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await hapticService?.light?.(); 

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isListening = true;
      logger.info(this.MODULE, 'Started recording chunk...');
    } catch (error) {
      logger.error(this.MODULE, 'Start listening failed', error);
      throw error;
    }
  }

  static async stopListening(): Promise<SpeechRecognitionResult> {
    try {
      if (!this.recording) throw new Error('No active recording');

      await this.recording.stopAndUnloadAsync();
      let uri = this.recording.getURI();
      this.recording = null;
      this.isListening = false;

      if (!uri) return { success: false, text: '', error: 'URI not found' };

      // CRITICAL FIX: React Native fetch requires the file:// prefix to upload successfully
      if (!uri.startsWith('file://')) {
        uri = `file://${uri}`;
      }

      // Route directly to Groq since OpenAI is out of quota
      if (this.isGroqConfigured()) {
        return await this.transcribeWithGroq(uri);
      } else {
        logger.warn(this.MODULE, 'Groq key missing, attempting OpenAI fallback');
        return await this.transcribeWithWhisper(uri);
      }

    } catch (error) {
      logger.error(this.MODULE, 'Stop listening failed', error);
      return { success: false, text: '', error: (error as Error).message };
    }
  }

  /**
   * Transcribe using Groq API (using Whisper large model)
   */
  private static async transcribeWithGroq(audioUri: string): Promise<SpeechRecognitionResult> {
    try {
      logger.info(this.MODULE, 'Calling Groq Whisper API...');

      const formData = new FormData();
      // @ts-ignore: React Native requires this specific object structure for files
      formData.append('file', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' });
      formData.append('model', 'whisper-large-v3-turbo'); // Groq's fastest whisper model
      
      // CRITICAL FIX: Set language to 'en' to output English characters
      // This allows "Hey Seevia" and Roman Urdu commands to match correctly in code
      formData.append('language', 'en'); 

      const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          // Note: NO Content-Type header here. React Native sets the multipart boundary automatically.
        },
        body: formData,
      });

      if (!groqResponse.ok) {
        const errorData = await groqResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq error: ${groqResponse.status}`);
      }

      const data = await groqResponse.json();
      logger.info(this.MODULE, `Groq transcription success: "${data.text}"`);
      return { success: true, text: data.text, confidence: 0.99 };

    } catch (error) {
      logger.error(this.MODULE, 'Groq transcription failed', error);
      return { success: false, text: '', error: 'Groq API failed' };
    }
  }

  /**
   * Fallback: Send audio file to OpenAI Whisper API
   */
  private static async transcribeWithWhisper(audioUri: string): Promise<SpeechRecognitionResult> {
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Setting to 'en' here for consistency

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.OPENAI}`, 
          // Note: NO Content-Type header here either!
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI Transcription failed');
      }

      return { success: true, text: data.text, confidence: 0.99 };
    } catch (error: any) {
      logger.error(this.MODULE, 'Whisper API Error:', error.message);
      return { success: false, text: '', error: error.message };
    }
  }

  static async listenForCommand(timeoutMs: number = 3000): Promise<SpeechRecognitionResult> {
    await this.startListening();
    return new Promise<SpeechRecognitionResult>((resolve) => {
      const timeoutHandle = setTimeout(async () => {
        try {
          const result = await this.stopListening();
          resolve(result);
        } catch (error) {
          logger.error(this.MODULE, 'Error in timeout handler', error);
          resolve({ success: false, text: '', error: 'Timeout error' });
        }
      }, timeoutMs);
      
      // Store handle for potential cancellation
      (this as any).currentTimeoutHandle = timeoutHandle;
    });
  }

  static cancelTimeoutWait(): void {
    if ((this as any).currentTimeoutHandle) {
      clearTimeout((this as any).currentTimeoutHandle);
      (this as any).currentTimeoutHandle = null;
    }
  }

  static async cancelListening(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isListening = false;
    }
  }
}