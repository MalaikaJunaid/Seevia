import * as Speech from 'expo-speech';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  language?: string;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (err: any) => void;
}

/**
 * Seevia Unified Speech Engine
 * Orchestrates auditory feedback with support for sequential processing and affective AI modulation.
 */

/**
 * Promise-based speak that resolves when speaking finishes.
 * Crucial for building audible lists (e.g., Expiry Summaries).
 */
export async function speakAsync(text: string, opts?: SpeakOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      Speech.stop(); // Prevent overlapping speech
      
      Speech.speak(text ?? '', {
        // Affective AI: Slightly slower rate (0.9) for better PWD clarity
        rate: opts?.rate ?? 0.9,
        pitch: opts?.pitch ?? 1.0,
        language: opts?.language ?? 'en-US',
        voice: opts?.voice,
        onStart: () => {
          opts?.onStart?.();
          logger.info('SPEECH_SERVICE', `Started speaking: ${text.substring(0, 30)}...`);
        },
        onDone: () => {
          opts?.onDone?.();
          resolve();
        },
        onError: (err) => {
          opts?.onError?.(err);
          logger.error('SPEECH_SERVICE', 'TTS Failure', err);
          reject(err);
        },
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Speaks multiple lines in order with tactile pulses between each line.
 * Ideal for reading out a shopping list or multiple expiry warnings.
 */
export async function speakSequence(lines: string[], opts?: SpeakOptions): Promise<void> {
  for (const line of lines) {
    await hapticService.light(); // Small tactile cue between sentences
    await speakAsync(line, opts).catch(() => {
      /* Continue to next line even if one fails */
    });
  }
}

/**
 * Immediate stop for all ongoing speech.
 */
export function stop(): void {
  try {
    Speech.stop();
  } catch (e) {
    logger.error('SPEECH_SERVICE', 'Stop failed', e);
  }
}

export default {
  speakAsync,
  stop,
  speakSequence,
};
