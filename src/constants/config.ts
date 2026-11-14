/**
 * Seevia Global Configuration
 * Centralized settings for AI thresholds, safety protocols, and app behavior.
 */

// API Keys from environment variables
export const API_KEYS = {
  GOOGLE_CLOUD: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY || '',
  MAPBOX: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  DEEPGRAM: process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '',
  OPENAI: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  GEMINI: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  GROQ: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
  HUGGINGFACE: process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || '',
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
};

export const APP_CONFIG = {
  // AI & Vision Model Thresholds (0.95 for assistive tech safety)
  PRODUCT_RECOGNITION_CONFIDENCE_THRESHOLD: 0.95, // High precision for PWD safety
  OCR_CONFIDENCE_THRESHOLD: 0.95, // Increased for safety

  // Multi-Tier AI Fallback Thresholds (0.95 for assistive tech safety)
  AI_LOCAL_THRESHOLD: 0.95,       // Use local model only if confidence > 0.95
  AI_HUGGINGFACE_THRESHOLD: 0.80, // Use HuggingFace if confidence 0.80-0.95
  AI_CLOUD_THRESHOLD: 0,          // Use cloud fallback if confidence < 0.80

  // Inventory & Pantry Logic
  EXPIRY_WARNING_DAYS: 3, // Days before expiry to trigger alert
  LOW_STOCK_THRESHOLD: 1,

  // Voice & Interaction Settings
  SPEECH_TIMEOUT_MS: 5000, // Duration to wait for user speech
  TTS_RATE: 0.9, // Slower for clarity
  TTS_PITCH: 1.0,
  DEFAULT_LANGUAGE: 'en-US', // Bilingual support: en-US / ur (Roman Urdu)
  HAPTIC_FEEDBACK_ENABLED: true, // Global toggle for Seevia tactile feedback

  // Module 6: Emergency Settings
  SOS_COUNTDOWN_SECONDS: 30, // Increased to 30s to allow users to cancel false fall detections
  VOLUNTEER_RADIUS_KM: 5,
  FALL_DETECTION_THRESHOLD: 25, // m/s² magnitude threshold for fall detection
  FALL_CONFIRMATION_TIMEOUT_MS: 15000, // Wait 15s for user confirmation

  // Data & Sync Settings
  IMAGE_CACHE_SIZE_MB: 50,
  OFFLINE_DATA_SYNC_INTERVAL_MS: 30000, // Sync pantry every 30 seconds

  // API Timeouts
  API_TIMEOUT_MS: 10000, // 10 second timeout for API calls
  VISION_API_TIMEOUT_MS: 15000, // 15 second timeout for vision APIs

  // Accessibility
  MIN_TOUCH_TARGET_SIZE: 48, // Minimum touch target size in pixels (WCAG)
  HIGH_CONTRAST_MODE: true,
  SCREEN_READER_ANNOUNCEMENT_DELAY_MS: 500,
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
