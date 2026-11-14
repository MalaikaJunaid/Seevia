import { API_KEYS } from '@/constants/config';
import { logger } from '@/utils/logger';

/**
 * Seevia Google Vision Configuration
 * Manages authentication and feature sets for the AI Vision Module.
 */
export const GOOGLE_VISION_CONFIG = {
  apiKey: API_KEYS.GOOGLE_CLOUD,
  endpoint: 'https://vision.googleapis.com/v1/images:annotate',

  // Feature flags to reduce payload size and processing latency
  features: {
    OCR: 'TEXT_DETECTION',
    LABELING: 'LABEL_DETECTION',
    PROPERTIES: 'IMAGE_PROPERTIES',
    DOCUMENT_TEXT: 'DOCUMENT_TEXT_DETECTION',
  }
};

/**
 * Validates if the Vision API is ready to process requests.
 */
export const isVisionReady = (): boolean => {
  if (!GOOGLE_VISION_CONFIG.apiKey) {
    logger.warn('VISION_CONFIG', 'Google Vision API key not configured. Check EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY');
    return false;
  }
  return true;
};

/**
 * Gemini Vision Configuration
 */
export const GEMINI_CONFIG = {
  apiKey: API_KEYS.GEMINI,
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
};

/**
 * Groq Configuration
 */
export const GROQ_CONFIG = {
  apiKey: API_KEYS.GROQ,
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.1-70b-versatile',
};

/**
 * HuggingFace Configuration
 */
export const HUGGINGFACE_CONFIG = {
  apiKey: API_KEYS.HUGGINGFACE,
  endpoint: 'https://api-inference.huggingface.co/models',
};