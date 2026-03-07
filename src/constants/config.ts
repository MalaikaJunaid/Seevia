/**
 * Seevia Global Configuration
 * Centralized settings for AI thresholds, safety protocols, and app behavior.
 */
export const APP_CONFIG = {
  // AI & Vision Model Thresholds
  PRODUCT_RECOGNITION_CONFIDENCE_THRESHOLD: 0.85, // High precision for PWD safety
  OCR_CONFIDENCE_THRESHOLD: 0.70,
  
  // Inventory & Pantry Logic
  EXPIRY_WARNING_DAYS: 3, // Days before expiry to trigger alert
  LOW_STOCK_THRESHOLD: 1,
  
  // Voice & Interaction Settings
  SPEECH_TIMEOUT_MS: 5000, // Duration to wait for user speech
  TTS_RATE: 1.0,
  TTS_PITCH: 1.0,
  HAPTIC_FEEDBACK_ENABLED: true, // Global toggle for Seevia tactile feedback
  
  // Module 6: Emergency Settings
  SOS_COUNTDOWN_SECONDS: 30, // Increased to 30s to allow users to cancel false fall detections
  VOLUNTEER_RADIUS_KM: 5,
  
  // Data & Sync Settings
  IMAGE_CACHE_SIZE_MB: 50,
  OFFLINE_DATA_SYNC_INTERVAL_MS: 30000, // Sync pantry every 30 seconds
};

/**
 * Standardized Error Messages
 * High-contrast, clear language for accessibility.
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet.',
  CAMERA_PERMISSION: 'Camera permission is required for scanning.',
  MIC_PERMISSION: 'Microphone permission is required for voice commands.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  FIREBASE_ERROR: 'Failed to connect to database. Please try again.',
  PRODUCT_NOT_FOUND: 'Product not recognized. Try scanning again or add manually.',
  VOICE_NOT_RECOGNIZED: 'Could not understand command. Please try again.',
};
