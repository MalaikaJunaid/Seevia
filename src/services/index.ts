/**
 * Seevia Services Index
 * Centralized export for all services
 */

// Module 1: User Profile & Settings (FR1.1-FR1.4)
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
} from './profile';

// Module 2: Voice Command Interface (FR2.1-FR2.4)
export {
  voiceCommandService,
  type VoiceCommand,
  type CommandIntent,
  type CommandHandler,
  type VoiceCommandConfig,
} from './voice/voiceCommands.orchestrator';

// Shopping Services (Module 4)
export {
  visionControllerService,
  productDatabaseService,
  shoppingListService,
  storeLayoutService,
} from './shopping';
export type {
  DetectionResult,
  DetectionConfig,
  Product,
  ProductSearchResult,
  ShoppingList,
  ShoppingListItem,
  PurchaseHistory,
  Store,
  Aisle,
  NavigationPath,
  NavigationInstruction,
} from './shopping';

// AI Services
export { aiFallbackService, AIFallbackService } from './ai/aiFallback.service';
export { modelLoaderService, ModelLoaderService } from './ai/modelLoader.service';
export { OCRService } from './ai/ocr.service';
export { ProductRecognitionService } from './ai/productRecognition.service';
export { intentEngineService } from './ai/intentEngine.service';
export { conversationService } from './ai/conversation.service';
export { sceneImaginationService } from './ai/sceneImagination.service';

// Voice Services (Consolidated)
export { voiceManager } from './voice/voiceManager.service';
export { romanUrduTTSService, RomanUrduTTSService } from './voice/romanUrduTTS.service';
export { deepgramSTTService, DeepgramSTTService } from './voice/deepgramSTT.service';
export { SpeechToTextService } from './voice/speechToText.service';
export { TextToSpeechService } from './voice/textToSpeech.service';
export { voiceService } from './voice/voiceService';
export { wakeWordService } from './voice/wakeWord.service';
export { VoiceCommandsService } from './voice/voiceCommands.service';

// Common Services
export { hapticService } from './common/haptic.service';
export { notificationService } from './common/notification.service';

// Emergency Services
export { sosService } from './emergency/sos.service';
export { sensorService } from './emergency/sensor.service';
export { locationService } from './emergency/location.service';
export { emergencyService } from './emergency/emergency.service';
export type {
  SOSActivationType,
  SOSStatus,
  EmergencyContactAlert,
  FallDetectionSettings,
} from './emergency/emergency.service';

// Firebase Services
export { AuthService } from './firebase/auth.service';
export { FirestoreService } from './firebase/firestore.service';
export { StorageService } from './firebase/storage.service';

// Pantry Services (Module 3)
export {
  pantryManagementService,
  barcodeService,
  dietaryPreferencesService,
} from './pantry';
export type {
  PantryItem,
  PantryStats,
  ExpiryNotification,
  BarcodeResult,
  DietaryPreferences,
  UserProfile,
} from './pantry';

// Legacy pantry services (backward compatibility)
export { pantryService } from './pantry/pantry.service';
export { expiryService } from './pantry/expiry.service';
export { shoppingListService } from './pantry/shoppingList.service';

// Scanner Services
export { barcodeService } from './scanner/barcode.service';
export { productDatabaseService } from './scanner/productDatabase.service';

// Profile Services
export { ProfileService } from './profile/ProfileService';

// Volunteer Services
export { volunteerService } from './volunteer.service';
export type { VolunteerProfile, HelpCase, EnvironmentMapping, VolunteerReview } from './volunteer.service';