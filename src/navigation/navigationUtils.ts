
import { router } from 'expo-router';

/**
 * Global Navigation Utility
 * Allows services (like Voice Intent Engine) to trigger screen changes 
 * without needing a React Component context.
 */
export const SeeviaNavigator = {
  goToHome: () => router.replace('/(tabs)/home'),
  
  goToPantry: () => router.push('/(tabs)/pantry'),
  
  triggerEmergency: () => router.push('/emergency/SOSActiveScreen'),
  
  openScanner: () => router.push('/shopping/CameraVisionScreen'),
};
