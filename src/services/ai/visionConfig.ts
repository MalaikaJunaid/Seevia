import { APP_CONFIG } from '../../constants/config';
// Note: In a real production environment, the JSON key should be accessed via 
// environment variables or a secure vault, not committed directly to source control.

/**
 * Seevia Google Vision Configuration
 * Manages authentication and feature sets for the AI Vision Module.
 */
export const VISION_CONFIG = {
  // Pulling from APP_CONFIG for centralized key management
  apiKey: APP_CONFIG.GOOGLE_CLOUD_API_KEY, 
  baseUrl: 'https://vision.googleapis.com/v1/images:annotate',
  
  // Feature flags to reduce payload size and processing latency
  features: {
    OCR: 'TEXT_DETECTION',
    LABELING: 'LABEL_DETECTION',
    PROPERTIES: 'IMAGE_PROPERTIES'
  }
};

/**
 * Validates if the Vision API is ready to process requests.
 */
export const isVisionReady = (): boolean => {
  if (!VISION_CONFIG.apiKey) {
    console.error('GOOGLE_VISION_CONFIG: API Key is missing. Check your environment variables.');
    return false;
  }
  return true;
};
