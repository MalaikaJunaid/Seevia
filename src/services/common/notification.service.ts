import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { hapticService } from '@/src/services/voice/haptic.service';
import { logger } from '@/src/utils/logger';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Seevia Notification Service
 * Manages local alerts and remote push tokens for PWD assistance.
 */
class NotificationService {
  private readonly MODULE = 'NOTIFICATION_SERVICE';

  /**
   * Initialize permissions and setup channels
   */
  async initialize() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
      });
      
      await Notifications.setNotificationChannelAsync('pantry', {
        name: 'Pantry Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  /**
   * Schedule a local notification for Expiry or Low Stock
   */
  async notify(title: string, body: string, type: 'emergency' | 'pantry' | 'shopping') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type },
          sound: type === 'emergency' ? 'default' : undefined,
        },
        trigger: null, // Send immediately
      });

      // Trigger tactile feedback based on priority
      if (type === 'emergency') {
        await hapticService.error();
      } else {
        await hapticService.success();
      }
    } catch (error) {
      logger.error(this.MODULE, 'Notification failed', error);
    }
  }

  /**
   * Helper for Expiry warnings
   */
  async sendExpiryAlert(itemName: string, daysLeft: number) {
    const title = daysLeft <= 0 ? "⚠️ Item Expired" : "⏳ Expiry Warning";
    const body = daysLeft <= 0 
      ? `Your ${itemName} has expired. Please discard it.` 
      : `Your ${itemName} will expire in ${daysLeft} days.`;
    
    await this.notify(title, body, 'pantry');
  }
}

export const notificationService = new NotificationService();
