/**
 * Seevia Module 1 & Module 2 Service Exports
 * Profile/Settings Management and Voice Command Interface
 * 
 * Module 1: User Profile & Settings (FR1.1-FR1.4)
 * - Voice-guided onboarding
 * - Profile creation and management
 * - Emergency contact management
 * - Accessibility preferences
 * 
 * Module 2: Voice Command Interface (FR2.1-FR2.4)
 * - Voice command recognition
 * - Wake word detection ("Hey Seevia")
 * - Intent classification
 * - Command execution
 * - Offline support
 */

export {
  userProfileService,
  ONBOARDING_STEPS,
  type UserProfile,
  type EmergencyContact,
  type HealthProfile,
  type AccessibilityPreferences,
  type UserPreferences,
  type InteractionMode,
  type Language,
  type VoicePitch,
  type ContrastMode,
  type OnboardingStep,
} from './profile.service';

export {
  voiceCommandService,
  type VoiceCommand,
  type CommandIntent,
  type CommandHandler,
  type VoiceCommandConfig,
} from '../voice/voiceCommands.orchestrator';
