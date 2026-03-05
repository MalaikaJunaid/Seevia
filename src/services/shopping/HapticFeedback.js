import * as Haptics from 'expo-haptics';

/**
 * HapticFeedback.js: The Tactile Interface for Seevia.
 * Provides physical cues for navigation and safety.
 */
export default class HapticFeedback {
  
  // 1. Success / Item Found (Double Light Tap)
  static async itemFound() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // 2. Turn Left (Two quick pulses)
  static async turnLeft() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
  }

  // 3. Turn Right (One heavy pulse)
  static async turnRight() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // 4. STOP / Danger (Long Warning Vibration)
  static async stopWarning() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  // 5. Walking Pace (Subtle 'Heartbeat' to confirm the app is still tracking)
  static async navigationPulse() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}
