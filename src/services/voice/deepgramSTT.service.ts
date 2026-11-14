import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';

/**
 * DeepgramSTTService - Speech-to-Text via Deepgram API
 * Handles microphone recording, file reading, and real-time transcription.
 * Optimized for Roman Urdu and English commands.
 */
class DeepgramSTTService {
  private recording: Audio.Recording | null = null;
  private uri: string | null = null;
  private isInitialized: boolean = false;
  private readonly MODULE = 'DEEPGRAM_STT';

  // Make sure to add this to your .env file
  private readonly API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '';

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Microphone permission not granted');
        return false;
      }
      
      this.isInitialized = true;
      logger.info(this.MODULE, '🎤 Initialized and ready for recording');
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Initialization failed', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Microphone permission denied by user');
        return false;
      }
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Error requesting permissions', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // HIGH_QUALITY preset creates .m4a files which Deepgram processes easily
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      logger.info(this.MODULE, 'Recording started');
      return true;
    } catch (err) {
      logger.error(this.MODULE, 'Failed to start recording', err);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }
      
      await this.recording.stopAndUnloadAsync();
      this.uri = this.recording.getURI();
      this.recording = null;
      
      return this.uri;
    } catch (err) {
      logger.error(this.MODULE, 'Failed to stop recording', err);
      this.recording = null;
      return null;
    }
  }

  /**
   * Transcribe the audio file using Deepgram REST API
   */
  private async transcribeAudio(fileUri: string): Promise<string> {
    if (!this.API_KEY) {
      logger.error(this.MODULE, 'Missing Deepgram API Key in environment variables');
      return '';
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist locally');
      }

      // Prepare file for upload
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'audio/m4a',
        name: 'command.m4a',
      } as any);

      // Deepgram Query Params:
      // nova-2: Best accuracy
      // detect_language=true: Handles English and Urdu dynamically
      // punctuate=true: Makes intent parsing easier later
      const url = 'https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true&punctuate=true';

      logger.info(this.MODULE, 'Uploading to Deepgram for transcription...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.API_KEY}`,
          // Let fetch automatically set the Content-Type with the correct boundary for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
      
      logger.info(this.MODULE, `Transcription result: "${transcript}"`);
      return transcript;

    } catch (error) {
      logger.error(this.MODULE, 'Transcription failed', error);
      return '';
    }
  }

  /**
   * Listen for a voice command with timeout
   * Returns recognized text and success status
   */
  async listenForCommand(timeoutMs: number = 6000): Promise<{ success: boolean; text: string }> {
    try {
      const started = await this.startRecording();
      if (!started) {
        return { success: false, text: '' };
      }

      return new Promise((resolve) => {
        const timeoutHandle = setTimeout(async () => {
          try {
            const uri = await this.stopRecording();
            if (!uri) {
              resolve({ success: false, text: '' });
              return;
            }

            // Perform the actual AI transcription
            const transcript = await this.transcribeAudio(uri);
            
            resolve({ 
              success: transcript.length > 0, 
              text: transcript 
            });

          } catch (error) {
            logger.error(this.MODULE, 'Error in timeout handler', error);
            resolve({ success: false, text: '' });
          }
        }, timeoutMs);

        // Store timeout handle for potential cancellation
        (this as any).currentTimeoutHandle = timeoutHandle;
      });
    } catch (error) {
      logger.error(this.MODULE, 'Error in listenForCommand', error);
      return { success: false, text: '' };
    }
  }

  cancelRecording(): void {
    try {
      if ((this as any).currentTimeoutHandle) {
        clearTimeout((this as any).currentTimeoutHandle);
      }
      if (this.recording) {
        this.recording.stopAndUnloadAsync().catch(err => 
          logger.error(this.MODULE, 'Error canceling recording', err)
        );
        this.recording = null;
      }
      logger.info(this.MODULE, 'Recording cancelled');
    } catch (error) {
      logger.error(this.MODULE, 'Error canceling', error);
    }
  }
}

export const deepgramSTTService = new DeepgramSTTService();
export default DeepgramSTTService;