import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Seevia Accessibility Hook
 * Centralizes Haptics, Screen Reader support, and Voice Announcements.
 */
export function useAccessibility() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    // Initial checks for Accessibility settings
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);

    // Event listeners for real-time setting changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    return () => {
      screenReaderListener.remove();
      reduceMotionListener.remove();
    };
  }, []);

  /**
   * Triggers Screen Reader Announcement (Visible text to speech)
   */
  const announceForAccessibility = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  /**
   * Global Haptic Trigger for Seevia Tactile Feedback
   */
  const triggerHapticFeedback = async (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
  ) => {
    if (Platform.OS === 'web') return; // Haptics not supported on standard web
    
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback unavailable:', error);
    }
  };

  /**
   * Shortcut for Multimodal Alerts (Vibrate + Speak)
   * Essential for Seevia Emergency and Vision modules.
   */
  const triggerMultimodalAlert = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    triggerHapticFeedback(type);
    Speech.speak(message, { rate: 1.0 });
    announceForAccessibility(message);
  };

  return {
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    announceForAccessibility,
    triggerHapticFeedback,
    triggerMultimodalAlert,
  };
}
