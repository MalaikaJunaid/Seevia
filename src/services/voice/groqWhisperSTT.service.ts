import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';

/**
 * GroqWhisperSTTService — Blazing fast Speech-to-Text via Groq LPUs
 *
 * KEY FIX: Global isRecording mutex prevents "Only one Recording object can
 * be prepared at a given time" cascade. Both startRecording() and
 * listenForCommand() check + set this flag atomically before touching Audio.
 */
class GroqWhisperSTTService {
  private recording: Audio.Recording | null = null;
  private uri: string | null = null;
  private isInitialized = false;
  private readonly MODULE = 'GROQ_WHISPER_STT';
  private readonly API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

  // ─── MUTEX: prevents concurrent recording attempts ─────────────────────────
  private isRecording = false;
  private pendingStop: (() => void) | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Microphone permission not granted');
        return false;
      }
      this.isInitialized = true;
      logger.info(this.MODULE, '🎤 Groq Whisper initialized and ready');
      return true;
    } catch (e) {
      logger.error(this.MODULE, 'Initialization failed', e);
      return false;
    }
  }

  /** True if mic is currently in use */
  get busy(): boolean { return this.isRecording; }

  async startRecording(): Promise<boolean> {
    // Hard guard — if already recording, refuse silently
    if (this.isRecording) {
      logger.warn(this.MODULE, 'Already recording. Skipping duplicate startRecording()');
      return false;
    }
    try {
      this.isRecording = true;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      logger.info(this.MODULE, 'Recording started');
      return true;
    } catch (err) {
      this.isRecording = false;
      logger.error(this.MODULE, 'Failed to start recording', err);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        this.isRecording = false;
        return null;
      }
      await this.recording.stopAndUnloadAsync();
      // Switch audio mode back so TTS / speakers work
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });
      this.uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;
      return this.uri;
    } catch (err) {
      logger.error(this.MODULE, 'Failed to stop recording', err);
      this.recording = null;
      this.isRecording = false;
      return null;
    }
  }

  /** Transcribe an audio file via Groq Whisper */
  private async transcribeAudio(fileUri: string): Promise<string> {
    if (!this.API_KEY) {
      logger.error(this.MODULE, 'Missing Groq API Key');
      return '';
    }
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error('Audio file does not exist locally');

      const formData = new FormData();
      formData.append('file', { uri: fileUri, type: 'audio/m4a', name: 'cmd.m4a' } as any);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'json');
      formData.append('temperature', '0.0');
      formData.append('prompt', 'pantry kholo, add milk, emergency, kya hai, allergen, shopping, seevia');

      logger.info(this.MODULE, 'Uploading to Groq LPU for lightning-fast transcription...');
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.API_KEY}` },
        body: formData,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Groq API error ${response.status}: ${txt}`);
      }

      const result = await response.json();
      const transcript = (result.text || '').trim();
      logger.info(this.MODULE, `Groq Transcription: "${transcript}"`);
      return transcript;
    } catch (e) {
      logger.error(this.MODULE, 'Groq Transcription failed', e);
      return '';
    }
  }

  /**
   * Record for `timeoutMs` ms then transcribe.
   * Returns immediately if mic is already in use.
   */
  async listenForCommand(timeoutMs = 6000): Promise<{ success: boolean; text: string }> {
    // Guard: don't stack recordings
    if (this.isRecording) {
      logger.warn(this.MODULE, 'listenForCommand: mic busy, skipping');
      return { success: false, text: '' };
    }

    try {
      const started = await this.startRecording();
      if (!started) return { success: false, text: '' };

      return new Promise((resolve) => {
        const handle = setTimeout(async () => {
          try {
            const uri = await this.stopRecording();
            if (!uri) { resolve({ success: false, text: '' }); return; }
            const text = await this.transcribeAudio(uri);
            resolve({ success: text.length > 0, text });
          } catch (e) {
            logger.error(this.MODULE, 'Error in timeout handler', e);
            await this.stopRecording().catch(() => {});
            resolve({ success: false, text: '' });
          }
        }, timeoutMs);

        (this as any)._handle = handle;
      });
    } catch (e) {
      logger.error(this.MODULE, 'Error in listenForCommand', e);
      this.isRecording = false;
      return { success: false, text: '' };
    }
  }

  /** Stop immediately without waiting for timeout */
  async stopEarly(): Promise<string | null> {
    if ((this as any)._handle) {
      clearTimeout((this as any)._handle);
      (this as any)._handle = null;
    }
    if (!this.recording) { this.isRecording = false; return null; }
    const uri = await this.stopRecording();
    return uri;
  }

  cancelRecording(): void {
    try {
      if ((this as any)._handle) {
        clearTimeout((this as any)._handle);
        (this as any)._handle = null;
      }
      if (this.recording) {
        this.recording.stopAndUnloadAsync().catch(() => {});
        this.recording = null;
      }
      this.isRecording = false;
      logger.info(this.MODULE, 'Recording cancelled');
    } catch (e) {
      logger.error(this.MODULE, 'Error canceling', e);
      this.isRecording = false;
    }
  }
}

export const groqSTTService = new GroqWhisperSTTService();
export default GroqWhisperSTTService;