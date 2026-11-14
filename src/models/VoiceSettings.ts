/**
 * Voice Settings and Configuration Types
 * Shared across voice and profile services
 */

export type VoiceGender = 'male' | 'female' | 'neutral';
export type VoicePitch = 'low' | 'medium' | 'high';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';

export interface VoiceSettings {
  gender?: VoiceGender;
  pitch?: VoicePitch;
  speed?: VoiceSpeed;
  enabled?: boolean;
}
