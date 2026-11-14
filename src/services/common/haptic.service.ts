import * as Haptics from 'expo-haptics';
import { logger } from '@/utils/logger';

export type HapticFeedbackType =
  | 'success' | 'error' | 'warning' 
  | 'light' | 'medium' | 'heavy'
  | 'selection' | 'double_tap' | 'triple_tap'
  | 'sos_heartbeat';

class HapticService {
  private readonly MODULE = 'HAPTIC_SERVICE';
  private isEnabled: boolean = true;

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Semantic Feedback (Accessibility Focused)
   */
  async success() {
    if (!this.isEnabled) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async error() {
    if (!this.isEnabled) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  async warning() {
    if (!this.isEnabled) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * Impact Feedback (UI/Physical Interaction)
   */
  async light() {
    if (!this.isEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async medium() {
    if (!this.isEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async heavy() {
    if (!this.isEnabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  async selection() {
    if (!this.isEnabled) return;
    await Haptics.selectionAsync();
  }

  /**
   * Specialized PWD Patterns
   */
  async doubleTap() {
    if (!this.isEnabled) return;
    try {
      await this.light();
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.light();
    } catch (error) {
      logger.error(this.MODULE, 'Double tap haptic failed', error);
    }
  }

  async sosHeartbeat(count: number = 5) {
    if (!this.isEnabled) return;
    try {
      for (let i = 0; i < count; i++) {
        await this.heavy();
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    } catch (error) {
      logger.error(this.MODULE, 'SOS heartbeat haptic failed', error);
    }
  }

  /**
   * Generic Dispatcher for Voice/Intent Engine
   */
  async trigger(type: HapticFeedbackType) {
    try {
      switch (type) {
        case 'success': return this.success();
        case 'error': return this.error();
        case 'warning': return this.warning();
        case 'light': return this.light();
        case 'medium': return this.medium();
        case 'heavy': return this.heavy();
        case 'selection': return this.selection();
        case 'double_tap': return this.doubleTap();
        case 'sos_heartbeat': return this.sosHeartbeat();
      }
    } catch (e) {
      logger.error(this.MODULE, `Haptic ${type} failed`, e);
    }
  }
}

export const hapticService = new HapticService();
