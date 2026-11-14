/**
 * Seevia Voice Services - Consolidated Export Index
 *
 * Primary Services (Use these):
 * - deepgramSTT - Speech-to-Text via Deepgram API
 * - romanUrduTTS - Roman Urdu Text-to-Speech
 * - voiceCommands - Intent classification for voice commands
 *
 * Legacy Services (Kept for backward compatibility):
 * - TtsService - Alias for textToSpeech
 * - speechService - Basic speech wrapper
 * - wakeWord - Wake word detection
 */

// Primary Voice Services
export { deepgramSTTService } from './deepgramSTT.service';
export { romanUrduTTSService } from './romanUrduTTS.service';
export { voiceCommandsService } from './voiceCommands.service';

// Backward Compatibility Exports
export { default as TtsService } from './TtsService';
export { TextToSpeechService } from './textToSpeech.service';
export { SpeechToTextService } from './speechToText.service';
export { wakeWordService } from './wakeWord.service';
export { default as WakePhraseListener } from './WakePhraseListener';

/**
 * Recommended Usage:
 *
 * // For Text-to-Speech (Urdu audio)
 * import { romanUrduTTSService } from '@/services/voice';
 * await romanUrduTTSService.speak('Aap kaise hain?', { language: 'ur' });
 *
 * // For Speech-to-Text (Urdu input)
 * import { deepgramSTTService } from '@/services/voice';
 * const result = await deepgramSTTService.listenForCommand(5000);
 *
 * // For Voice Command Intent Recognition
 * import { voiceCommandsService } from '@/services/voice';
 * const intent = await voiceCommandsService.classifyCommand('Pantry kholo');
 */
