/**
 * Seevia Caregiver Emergency Listener Service
 * Real-time listener for emergency logs on caregiver side
 * Plays alarm sounds and triggers notifications when PWD emergency is detected
 */

import { logger } from '@/utils/logger';
import { FirestoreService } from '../firebase/firestore.service';
import { notificationService } from '../common/notification.service';
import { hapticService } from '../common/haptic.service';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

export interface EmergencyListenerConfig {
  caregiverId: string;
  linkedPwdIds: string[];
  alarmSoundUri?: string;
  enableVibration: boolean;
  enableSound: boolean;
  enableNotification: boolean;
}

interface ActiveEmergencyAlert {
  logId: string;
  userId: string;
  triggerTime: number;
  soundPlaying: boolean;
}

class CaregiverEmergencyListenerService {
  private readonly MODULE = 'CAREGIVER_LISTENER';
  private firestoreService = new FirestoreService();
  private unsubscribers: (() => void)[] = [];
  private activeAlerts: Map<string, ActiveEmergencyAlert> = new Map();
  private alarmSound: Audio.Sound | null = null;
  private isListening = false;
  private config: EmergencyListenerConfig | null = null;

  // Custom alarm sound (internal siren-like sound)
  private readonly DEFAULT_ALARM_PATTERN = [0, 500, 200, 500, 200, 500];

  /**
   * Initialize listener for a caregiver
   * Set up real-time listeners for all linked PWD emergency logs
   */
  async initialize(config: EmergencyListenerConfig): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Initializing caregiver emergency listener', {
        caregiverId: config.caregiverId,
        pwdCount: config.linkedPwdIds.length,
      });

      this.config = config;

      // Setup audio for alarm sound
      await this.setupAlarmSound();

      // Setup real-time listeners for each linked PWD
      for (const pwdId of config.linkedPwdIds) {
        this.setupEmergencyLogListener(pwdId, config.caregiverId);
      }

      this.isListening = true;

      logger.info(this.MODULE, 'Caregiver emergency listener initialized successfully');
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to initialize listener', error);
      return false;
    }
  }

  /**
   * Setup real-time listener for PWD's emergency logs
   * Uses Firestore onSnapshot for real-time updates
   */
  private setupEmergencyLogListener(pwdId: string, caregiverId: string): void {
    try {
      logger.info(this.MODULE, 'Setting up listener for PWD', { pwdId });

      // Query active emergency logs for this PWD
      // In a real app, would use onSnapshot from Firebase SDK
      // For now, we set up polling mechanism
      this.setupEmergencyLogPoller(pwdId, caregiverId);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to setup listener for PWD', error);
    }
  }

  /**
   * Polling mechanism for checking new emergency logs
   * In production, replace with Firebase onSnapshot for real-time updates
   */
  private setupEmergencyLogPoller(pwdId: string, caregiverId: string): void {
    const pollInterval = setInterval(async () => {
      try {
        // Check for new active emergency logs
        const activeLogs = await this.firestoreService.queryDocuments('emergency_logs', [
          { field: 'userId', operator: '==', value: pwdId },
          { field: 'status', operator: '==', value: 'active' },
        ]);

        for (const log of activeLogs) {
          if (!this.activeAlerts.has(log.id)) {
            // New emergency detected!
            logger.warn(
              this.MODULE,
              'New emergency log detected - triggering caregiver alert',
              { logId: log.id, userId: pwdId }
            );

            await this.onEmergencyDetected(log, caregiverId);
          }
        }
      } catch (error) {
        logger.error(this.MODULE, 'Error polling for emergency logs', error);
      }
    }, 2000); // Poll every 2 seconds

    // Store unsubscriber for cleanup
    this.unsubscribers.push(() => clearInterval(pollInterval));
  }

  /**
   * Handle newly detected emergency
   * Play alarm, send notification, trigger vibration
   */
  private async onEmergencyDetected(log: any, caregiverId: string): Promise<void> {
    try {
      logger.warn(this.MODULE, 'EMERGENCY ALERT TRIGGERED FOR CAREGIVER', {
        logId: log.id,
        userId: log.userId,
        type: log.type,
      });

      // Create active alert tracking
      const activeAlert: ActiveEmergencyAlert = {
        logId: log.id,
        userId: log.userId,
        triggerTime: Date.now(),
        soundPlaying: false,
      };

      this.activeAlerts.set(log.id, activeAlert);

      // Step 1: Play alarm sound
      if (this.config?.enableSound) {
        await this.playAlarmSound(log);
      }

      // Step 2: Trigger vibration pattern
      if (this.config?.enableVibration) {
        await this.triggerAlarmVibration();
      }

      // Step 3: Send push notification
      if (this.config?.enableNotification) {
        await this.sendEmergencyNotification(log);
      }

      // Step 4: Log to Firebase with notification marker
      await this.firestoreService.updateDocument('emergency_logs', log.id, {
        notificationSent: true,
        caregiverNotifiedAt: Date.now(),
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to handle emergency detection', error);
    }
  }

  /**
   * Play continuous alarm sound
   * Mimics emergency siren pattern
   */
  private async playAlarmSound(log: any): Promise<void> {
    try {
      logger.info(this.MODULE, 'Playing alarm sound', { logId: log.id });

      if (this.alarmSound) {
        // Stop existing sound
        try {
          await this.alarmSound.stopAsync();
          await this.alarmSound.unloadAsync();
        } catch (e) {
          logger.debug(this.MODULE, 'Error stopping previous alarm');
        }
      }

      // Create and play new alarm sound
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/emergency-alarm.mp3'), // Fallback: built-in alarm
        { shouldPlay: true, isLooping: true }
      );

      this.alarmSound = sound;

      const activeAlert = this.activeAlerts.get(log.id);
      if (activeAlert) {
        activeAlert.soundPlaying = true;
      }

      logger.info(this.MODULE, 'Alarm sound playing', { logId: log.id });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to play alarm sound', error);

      // Fallback: use haptic feedback if audio fails
      await this.triggerAlarmVibration();
    }
  }

  /**
   * Stop alarm sound for a specific emergency
   */
  async stopAlarmSound(logId: string): Promise<void> {
    try {
      if (this.alarmSound) {
        await this.alarmSound.stopAsync();
        this.alarmSound = null;

        const activeAlert = this.activeAlerts.get(logId);
        if (activeAlert) {
          activeAlert.soundPlaying = false;
        }

        logger.info(this.MODULE, 'Alarm sound stopped', { logId });
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to stop alarm sound', error);
    }
  }

  /**
   * Trigger continuous vibration pattern for alarm
   */
  private async triggerAlarmVibration(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Triggering alarm vibration pattern');

      // Continuous strong vibration pattern
      for (let i = 0; i < 5; i++) {
        await hapticService.trigger('error');
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms between pulses
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to trigger vibration', error);
    }
  }

  /**
   * Send emergency push notification to caregiver
   */
  private async sendEmergencyNotification(log: any): Promise<void> {
    try {
      const userLocation = log.location
        ? `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`
        : 'Unknown location';

      const title = '🚨 EMERGENCY ALERT';
      const body =
        log.type === 'fall'
          ? `Fall detected! PWD at ${userLocation}. Confidence: ${((log.fallDetails?.confidence || 0) * 100).toFixed(0)}%`
          : `Manual SOS! PWD at ${userLocation}. Immediate assistance needed.`;

      // Use notification service
      await notificationService.notify(title, body, 'emergency');

      // Also send as local notification for immediate display
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          vibrate: this.DEFAULT_ALARM_PATTERN,
          data: {
            type: 'emergency',
            logId: log.id,
            userId: log.userId,
            lat: log.location?.latitude,
            lon: log.location?.longitude,
          },
        },
        trigger: null, // Send immediately
      });

      logger.info(this.MODULE, 'Emergency notification sent to caregiver');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to send emergency notification', error);
    }
  }

  /**
   * Acknowledge emergency alert (caregiver received notification)
   */
  async acknowledgeEmergency(logId: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Acknowledging emergency', { logId });

      // Stop alarm sound
      await this.stopAlarmSound(logId);

      // Update log status
      await this.firestoreService.updateDocument('emergency_logs', logId, {
        caregiverAcknowledgedAt: Date.now(),
      });

      // Remove from active alerts
      this.activeAlerts.delete(logId);

      logger.info(this.MODULE, 'Emergency acknowledged by caregiver', { logId });
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to acknowledge emergency', error);
      return false;
    }
  }

  /**
   * Dismiss emergency (resolved by caregiver)
   */
  async dismissEmergency(logId: string, reason: string = 'false_alarm'): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Dismissing emergency', { logId, reason });

      // Stop alarm
      await this.stopAlarmSound(logId);

      // Mark as resolved
      await this.firestoreService.updateDocument('emergency_logs', logId, {
        status: 'resolved',
        resolutionReason: reason,
        caregiverDismissedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Remove from active alerts
      this.activeAlerts.delete(logId);

      logger.info(this.MODULE, 'Emergency dismissed', { logId });
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to dismiss emergency', error);
      return false;
    }
  }

  /**
   * Get all active emergency alerts
   */
  getActiveAlerts(): ActiveEmergencyAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Stop listening and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Shutting down emergency listener');

      // Unsubscribe from all listeners
      for (const unsubscriber of this.unsubscribers) {
        unsubscriber();
      }
      this.unsubscribers = [];

      // Stop alarm sound
      if (this.alarmSound) {
        await this.alarmSound.stopAsync();
        await this.alarmSound.unloadAsync();
        this.alarmSound = null;
      }

      this.activeAlerts.clear();
      this.isListening = false;

      logger.info(this.MODULE, 'Emergency listener shutdown complete');
    } catch (error) {
      logger.error(this.MODULE, 'Error during shutdown', error);
    }
  }

  /**
   * Check if listener is active
   */
  isActive(): boolean {
    return this.isListening;
  }

  // ==================== Private Helper Methods ====================

  private async setupAlarmSound(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
      });

      logger.info(this.MODULE, 'Audio configuration initialized');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to setup audio', error);
    }
  }
}

export const caregiverEmergencyListenerService = new CaregiverEmergencyListenerService();
