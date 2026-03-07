import * as Notifications from 'expo-notifications';
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAccessibility } from './useAccessibility';
import { APP_CONFIG } from '@/src/constants/config';

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { triggerHapticFeedback } = useAccessibility();
  
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Listener for when a notification is received while the app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      // Heavy tactile feedback for PWD awareness
      triggerHapticFeedback('heavy');
    });

    // Listener for when a user interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User interacted with notification:', response.notification.request.content.body);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  /**
   * Schedule a Local Expiry Alert
   */
  const scheduleExpiryAlert = async (itemName: string, expiryDate: Date) => {
    const triggerDate = new Date(expiryDate);
    triggerDate.setDate(triggerDate.getDate() - APP_CONFIG.EXPIRY_WARNING_DAYS);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🕒 Expiry Alert",
        body: `${itemName} will expire in ${APP_CONFIG.EXPIRY_WARNING_DAYS} days.`,
        data: { screen: 'Pantry' },
        sound: 'default',
      },
      trigger: triggerDate,
    });
  };

  /**
   * Trigger Immediate Emergency Notification (for SOS)
   */
  const sendEmergencyAlert = async (contactName: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 SEEVIA EMERGENCY",
        body: `SOS Alert sent to ${contactName}. Help is on the way.`,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Send immediately
    });
  };

  return {
    expoPushToken,
    notification,
    scheduleExpiryAlert,
    sendEmergencyAlert,
  };
}

/**
 * Setup Permissions & Channels
 */
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency SOS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF7A00',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}
