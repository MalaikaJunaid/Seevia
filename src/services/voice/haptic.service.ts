import * as Haptics from 'expo-haptics';
import { ACCESSIBILITY } from '@/src/theme/accessibility';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Haptic Feedback Service
 * Provides tactile communication for PWD-centric interactions.
 */
class HapticService {
  private readonly MODULE = 'HAPTIC_SERVICE';

  /**
   * General success feedback (e.g., item added to pantry)
   */
  async success() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      logger.error(this.MODULE, 'Haptic Success failed', e);
    }
  }

  /**
   * Warning feedback (e.g., item expiring soon)
   */
  async warning() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * Error/Danger feedback (e.g., SOS triggered or Scan failed)
   */
  async error() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  /**
   * Light 'click' for UI interactions (e.g., toggling a checkbox)
   */
  async lightImpact() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Heavy 'thud' for critical UI actions
   */
  async heavyImpact() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Specialized SOS Heartbeat
   * Repeated pulse to indicate an active emergency countdown.
   */
  async triggerSOSPulse() {
    // Uses the pattern logic defined in accessibility.ts
    // For Expo, we simulate the pattern with a sequence
    await this.heavyImpact();
    setTimeout(() => this.heavyImpact(), 200);
  }
}

export const hapticService = new HapticService();
