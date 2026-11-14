/**
 * Seevia Accessibility Hook
 * Centralizes Haptics, Screen Reader support, and Voice Announcements.
 * Designed for visually impaired users with Roman Urdu support.
 */

import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AccessibilityInfo, Platform, findNodeHandle, AccessibilityRole } from 'react-native';
import { romanUrduTTSService } from '@/services/voice/romanUrduTTS.service';
import { logger } from '@/utils/logger';

export interface AccessibilityConfig {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  preferredContentSize: 'small' | 'medium' | 'large' | 'extraLarge';
}

export interface HapticPattern {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  customPattern?: number[];
}

/**
 * useAccessibility - Comprehensive accessibility hook
 */
export function useAccessibility() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isHighContrastEnabled, setIsHighContrastEnabled] = useState(true);
  const announcementQueue = useRef<string[]>([]);
  const isAnnouncing = useRef(false);

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
   * Triggers Screen Reader Announcement
   */
  const announceForAccessibility = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  /**
   * Speak message with Roman Urdu support
   */
  const speak = useCallback(async (
    message: string,
    options?: { language?: 'ur' | 'en'; rate?: number }
  ) => {
    try {
      await romanUrduTTSService.speak(message, {
        language: options?.language || 'ur',
        rate: options?.rate || 0.9,
      });
    } catch (error) {
      // Fallback to basic speech
      Speech.speak(message, { rate: options?.rate || 0.9 });
    }
  }, []);

  /**
   * Global Haptic Trigger for Seevia Tactile Feedback
   */
  const triggerHapticFeedback = useCallback(async (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
  ) => {
    if (Platform.OS === 'web') return;

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
      logger.warn('ACCESSIBILITY', 'Haptic feedback unavailable', error);
    }
  }, []);

  /**
   * Directional haptic feedback for navigation
   * Pattern: left = 2 pulses, right = 3 pulses
   */
  const directionalHaptic = useCallback(async (direction: 'left' | 'right' | 'forward' | 'back') => {
    if (Platform.OS === 'web') return;

    try {
      if (direction === 'left') {
        // 2 short pulses for left
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await new Promise(r => setTimeout(r, 100));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (direction === 'right') {
        // 3 short pulses for right
        for (let i = 0; i < 3; i++) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await new Promise(r => setTimeout(r, 100));
        }
      } else if (direction === 'forward') {
        // 1 long pulse for forward
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (direction === 'back') {
        // 2 medium pulses for back
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise(r => setTimeout(r, 150));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      logger.warn('ACCESSIBILITY', 'Directional haptic failed', error);
    }
  }, []);

  /**
   * Emergency SOS haptic pattern
   * Pattern: ... --- ... (3 short, 3 long, 3 short)
   */
  const emergencyHaptic = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      // 3 short
      for (let i = 0; i < 3; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await new Promise(r => setTimeout(r, 150));
      }
      await new Promise(r => setTimeout(r, 300));

      // 3 long
      for (let i = 0; i < 3; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise(r => setTimeout(r, 400));
      }
      await new Promise(r => setTimeout(r, 300));

      // 3 short
      for (let i = 0; i < 3; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (error) {
      logger.warn('ACCESSIBILITY', 'Emergency haptic failed', error);
    }
  }, []);

  /**
   * Multimodal Alert (Vibrate + Speak)
   * Essential for Seevia Emergency and Vision modules.
   */
  const triggerMultimodalAlert = useCallback(async (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    options?: { language?: 'ur' | 'en'; hapticOnly?: boolean }
  ) => {
    // Haptic first (immediate feedback)
    await triggerHapticFeedback(type as any);

    // Voice announcement
    if (!options?.hapticOnly) {
      announceForAccessibility(message);
      await speak(message, { language: options?.language || 'ur' });
    }
  }, [triggerHapticFeedback, announceForAccessibility, speak]);

  /**
   * Navigation announcement with haptic direction
   */
  const announceNavigation = useCallback(async (
    direction: 'left' | 'right' | 'forward' | 'back' | 'stop',
    message: string
  ) => {
    // Haptic direction cue
    if (direction !== 'stop') {
      await directionalHaptic(direction as any);
    } else {
      await triggerHapticFeedback('heavy');
    }

    // Voice announcement
    await speak(message, { language: 'ur' });
    announceForAccessibility(message);
  }, [directionalHaptic, triggerHapticFeedback, speak, announceForAccessibility]);

  /**
   * Queue announcement (prevents overlapping speech)
   */
  const queueAnnouncement = useCallback((message: string) => {
    announcementQueue.current.push(message);
    processQueue();
  }, []);

  const processQueue = async () => {
    if (isAnnouncing.current || announcementQueue.current.length === 0) {
      return;
    }

    isAnnouncing.current = true;
    const message = announcementQueue.current.shift()!;

    try {
      await speak(message);
    } finally {
      isAnnouncing.current = false;
      // Process next in queue
      if (announcementQueue.current.length > 0) {
        processQueue();
      }
    }
  };

  return {
    // State
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    isHighContrastEnabled,

    // Basic feedback
    announceForAccessibility,
    speak,
    triggerHapticFeedback,

    // Directional feedback
    directionalHaptic,
    emergencyHaptic,

    // Combined feedback
    triggerMultimodalAlert,
    announceNavigation,
    queueAnnouncement,
  };
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  const focusRef = useRef<any>(null);

  const setFocus = useCallback(() => {
    if (focusRef.current) {
      const node = findNodeHandle(focusRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, []);

  return {
    focusRef,
    setFocus,
  };
}

/**
 * Accessibility props for components
 */
export interface AccessibleProps {
  accessible: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { selected?: boolean; disabled?: boolean; checked?: boolean };
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

/**
 * Generate accessible props for common components
 */
export function createAccessibleProps(
  label: string,
  hint?: string,
  role?: AccessibilityRole,
  state?: AccessibleProps['accessibilityState']
): AccessibleProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
    accessibilityState: state,
  };
}