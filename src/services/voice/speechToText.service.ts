import { Audio } from 'expo-av';
import { APP_CONFIG, ERROR_MESSAGES } from '@/src/constants/config';
import hapticService from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

export interface SpeechRecognitionResult {
  success: boolean;
  text: string;
  confidence?: number;
  error?: string;
}

/**
 * Seevia Speech-to-Text (STT) Service
 * Manages native microphone recording and bridges to OpenAI Whisper for bilingual transcription.
 */
export class SpeechToTextService {
  private static recording: Audio.Recording | null = null;
  private static isListening: boolean = false;
  private static readonly MODULE = 'STT_SERVICE';

  /**
   * Request microphone permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error(this.MODULE, 'Mic permission error', error);
      return false;
    }
  }

  /**
   * Start recording audio for transcription
   */
  static async startListening(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) throw new Error(ERROR_MESSAGES.MIC_PERMISSION);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await hapticService.light(); // Tactile cue: Recording started

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

  /**
   * Stop recording and send to OpenAI Whisper for transcription
   */
  static async stopListening(): Promise<SpeechRecognitionResult> {
    try {
      if (!this.recording) throw new Error('No active recording');

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isListening = false;

      if (!uri) return { success: false, text: '', error: 'URI not found' };

      return await this.transcribeWithWhisper(uri);
    } catch (error) {
      logger.error(this.MODULE, 'Stop listening failed', error);
      return { success: false, text: '', error: (error as Error).message };
    }
  }

  /**
   * Internal: Send audio file to Whisper API for English/Urdu transcription
   */
  private static async transcribeWithWhisper(audioUri: string): Promise<SpeechRecognitionResult> {
    try {
      const formData = new FormData();
      // @ts-ignore: React Native FormData requires this structure
      formData.append('file', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' });
      formData.append('model', 'whisper-1');
      formData.append('language', 'ur'); // Forces high-accuracy for Roman Urdu/English mix

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${APP_CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Transcription failed');

      return { success: true, text: data.text, confidence: 0.99 };
    } catch (error) {
      logger.error(this.MODULE, 'Whisper API Error', error);
      return { success: false, text: '', error: 'API connection failed' };
    }
  }

  static async listenForCommand(timeoutMs: number = 3000): Promise<SpeechRecognitionResult> {
    await this.startListening();
    return new Promise((resolve) => {
      setTimeout(async () => resolve(await this.stopListening()), timeoutMs);
    });
  }

  static async cancelListening(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.isListening = false;
    }
  }
}
