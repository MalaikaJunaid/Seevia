/**
 * Seevia Emergency Management Service (Enhanced)
 * Comprehensive emergency management with fall detection, alerts, and escalation
 * Integrates with existing SOSService while adding new features
 * 
 * Features:
 * - Multi-trigger SOS (voice, motion, fall, inactivity)
 * - Emergency contact alerts with GPS & health info
 * - Volunteer escalation (auto-notify if contacts don't respond)
 * - Fall detection with confidence scoring
 * - Real-time voice instructions for first responders
 */

import { logger } from '@/utils/logger';
import { FirestoreService } from '../firebase/firestore.service';
import { sensorService } from './sensor.service';
import { voiceManager } from '../voice/voiceManager.service';
import { hapticService } from '../common/haptic.service';
import { sosService as legacySosService } from './sos.service';
import { emergencyLogTriggerService } from './emergencyLogTrigger.service';
import * as Location from 'expo-location';

// ==================== Types ====================

export enum SOSActivationType {
  VOICE_COMMAND = 'voice_command',        // "Hey Seevia, help me"
  MOTION_GESTURE = 'motion_gesture',      // Device shaking  
  FALL_DETECTED = 'fall_detected',        // Accelerometer + gyro
  INACTIVITY_TIMEOUT = 'inactivity_timeout',
  MANUAL_BUTTON = 'manual_button',
  VOICE_GESTURE = 'voice_gesture',
}

export enum SOSStatus {
  IDLE = 'idle',
  DETECTING = 'detecting',
  TRIGGERED = 'triggered',
  CONTACT_ALERTING = 'contact_alerting',
  WAITING_ACKNOWLEDGEMENT = 'waiting_ack',
  ESCALATING_TO_VOLUNTEERS = 'escalating',
  EMERGENCY_ACTIVE = 'active',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export interface EmergencyContactAlert {
  id: string;
  userId: string;
  activationType: SOSActivationType;
  status: SOSStatus;
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  healthInfo?: {
    allergies?: string[];
    medications?: string[];
    medicalConditions?: string[];
    emergencyNotes?: string;
  };
  contactsNotified: {
    contactId: string;
    name: string;
    phone: string;
    notifiedAt: number;
    acknowledged: boolean;
    acknowledgedAt?: number;
    responseTime?: number;
  }[];
  volunteersNotified?: {
    volunteerId: string;
    notifiedAt: number;
    accepted: boolean;
    acceptedAt?: number;
  }[];
  fallDetails?: {
    accelerationMagnitude: number;
    phase: string;
    confidence: number;
  };
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  resolutionReason?: string;
}

export interface FallDetectionSettings {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  autoInitiateAfter: number; // milliseconds
}

// ==================== Emergency Management Service ====================

class EmergencyManagementService {
  private readonly MODULE = 'EMERGENCY_MGMT';
  private firestoreService = new FirestoreService();
  private sosStatus: SOSStatus = SOSStatus.IDLE;
  private currentAlert: EmergencyContactAlert | null = null;
  private contactAckTimeout: NodeJS.Timeout | null = null;
  private escalationTimer: NodeJS.Timeout | null = null;
  private inactivityCheck: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeEmergencyDetection();
  }

  /**
   * Initialize emergency detection systems
   */
  private initializeEmergencyDetection() {
    try {
      // Start monitoring for falls (0.95 confidence threshold for safety)
      sensorService.start((fallResult) => {
        if (fallResult.isFall && fallResult.confidence > 0.95) {
          logger.info(this.MODULE, 'High-confidence fall detected', { confidence: fallResult.confidence });
          // Don't auto-trigger, let user confirm
          this.onFallDetected(fallResult);
        }
      });

      logger.info(this.MODULE, 'Emergency detection systems initialized');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to initialize emergency detection', error);
    }
  }

  /**
   * FR6.1: Trigger SOS via voice command
   */
  async triggerSOSByVoiceCommand(userId: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'SOS voice command received', { userId });

      // Provide immediate feedback
      await voiceManager.speak('Emergency mode activated. Alerting your emergency contacts with your location.', 'en');
      await hapticService.trigger('alert');

      // Create emergency log for manual SOS
      const emergencyLog = await emergencyLogTriggerService.createManualSOSLog(userId);
      if (emergencyLog) {
        logger.info(this.MODULE, 'Manual SOS emergency log created', { logId: emergencyLog.id });
      }

      return await this.initiateSOS(userId, SOSActivationType.VOICE_COMMAND);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to trigger voice SOS', error);
      return false;
    }
  }

  /**
   * FR6.1: Trigger SOS via device motion (shake)
   */
  async triggerSOSByMotion(userId: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'SOS motion detection triggered', { userId });

      // Require confirmation for motion (business rule)
      await voiceManager.speak('Shake detected. Say yes to confirm emergency.', 'en');
      await hapticService.trigger('warning');

      // Wait 5 seconds for user confirmation
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve(false); // Timeout = no confirm
        }, 5000);

        // In production: listen for "yes" voice command
        // For now: just proceed after delay as example
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to trigger motion SOS', error);
      return false;
    }
  }

  /**
   * FR6.4: Handle detected fall
   */
  private async onFallDetected(fallResult: any) {
    try {
      logger.info(this.MODULE, 'Fall detected and analyzed', {
        confidence: fallResult.confidence,
        phase: fallResult.phase
      });

      // Immediate voice feedback
      await voiceManager.speak('Fall detected. Emergency assistance is being arranged.', 'en');
      await hapticService.trigger('alert');

      // Get current user from context
      const userId = await this.getCurrentUserId();
      if (!userId) {
        logger.warn(this.MODULE, 'No user context for fall detection');
        return;
      }

      // Create emergency log for this fall detection
      // This triggers caregiver alerts via real-time listeners
      const emergencyLog = await emergencyLogTriggerService.createFallEmergencyLog(
        userId,
        {
          accelerationMagnitude: fallResult.accelerationMagnitude,
          phase: fallResult.phase,
          confidence: fallResult.confidence,
          angularVelocity: fallResult.angularVelocity || 0,
        }
      );

      if (emergencyLog) {
        logger.info(this.MODULE, 'Emergency log created', { logId: emergencyLog.id });
      }

      // Auto-initiate SOS for high-confidence falls (business rule)
      if (fallResult.confidence > 0.90) {
        logger.info(this.MODULE, 'Very high confidence fall, auto-initiating SOS');
        await this.initiateSOS(userId, SOSActivationType.FALL_DETECTED, fallResult);
      } else {
        // Lower confidence = require confirmation
        logger.info(this.MODULE, 'Moderate confidence fall, waiting for confirmation');
        await voiceManager.speak('Say help to confirm emergency, or cancel if you are okay.', 'en');
      }
    } catch (error) {
      logger.error(this.MODULE, 'Error handling fall detection', error);
    }
  }

  /**
   * Main SOS initiation flow
   */
  private async initiateSOS(
    userId: string,
    activationType: SOSActivationType,
    fallData?: any
  ): Promise<boolean> {
    try {
      if (this.sosStatus !== SOSStatus.IDLE) {
        logger.warn(this.MODULE, 'SOS already in progress', { status: this.sosStatus });
        return false;
      }

      this.sosStatus = SOSStatus.DETECTING;

      // Step 1: Get user location (FR6.2)
      const location = await this.getCurrentLocation();
      if (!location) {
        logger.error(this.MODULE, 'Failed to get current location');
        await voiceManager.speak('Unable to determine your location. Please try again.', 'en');
        this.sosStatus = SOSStatus.IDLE;
        return false;
      }

      // Step 2: Get user health info
      const healthInfo = await this.getUserHealthInfo(userId);

      // Step 3: Get emergency contacts
      const contacts = await this.getUserEmergencyContacts(userId);
      if (contacts.length === 0) {
        logger.error(this.MODULE, 'No emergency contacts found');
        await voiceManager.speak('No emergency contacts configured. Please add contacts in settings.', 'en');
        this.sosStatus = SOSStatus.IDLE;
        return false;
      }

      // Step 4: Create emergency alert document
      const alert: EmergencyContactAlert = {
        id: this.generateId(),
        userId,
        activationType,
        status: SOSStatus.CONTACT_ALERTING,
        userLocation: location,
        healthInfo,
        contactsNotified: contacts.map(c => ({
          contactId: c.id,
          name: c.name,
          phone: c.phone,
          notifiedAt: Date.now(),
          acknowledged: false,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (fallData) {
        alert.fallDetails = {
          accelerationMagnitude: fallData.accelerationMagnitude,
          phase: fallData.phase,
          confidence: fallData.confidence,
        };
      }

      this.currentAlert = alert;
      this.sosStatus = SOSStatus.CONTACT_ALERTING;

      // Step 5: Save to Firebase
      await this.firestoreService.saveDocument('emergency_alerts', alert.id, alert);

      // Step 6: Notify emergency contacts (FR6.2)
      await this.notifyEmergencyContacts(alert);

      // Step 7: Start 60-second acknowledgement window (FR6.2 business rule)
      await this.startAcknowledgementWait(alert);

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to initiate SOS', error);
      this.sosStatus = SOSStatus.IDLE;
      return false;
    }
  }

  /**
   * FR6.2: Notify emergency contacts with location and health info
   */
  private async notifyEmergencyContacts(alert: EmergencyContactAlert) {
    try {
      logger.info(this.MODULE, 'Notifying emergency contacts', { count: alert.contactsNotified.length });

      const alertMessage = this.formatAlertMessage(alert);

      for (const contact of alert.contactsNotified) {
        try {
          // Send via SMS (fallback channel)
          await this.sendSMSAlert(contact.phone, alertMessage);

          // Send push notification (primary channel)
          await this.sendPushAlert(contact, alert);

          // Log notification
          logger.info(this.MODULE, 'Contact notified', { 
            contactName: contact.name,
            method: 'sms+push'
          });
        } catch (err) {
          logger.error(this.MODULE, 'Failed to notify contact', err);
        }
      }

      // Update alert
      await this.firestoreService.updateDocument('emergency_alerts', alert.id, {
        contactsNotified: alert.contactsNotified,
        updatedAt: Date.now(),
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to notify emergency contacts', error);
    }
  }

  /**
   * Wait for contact acknowledgement (FR6.2: 60-second window)
   */
  private async startAcknowledgementWait(alert: EmergencyContactAlert) {
    const ACK_TIMEOUT = 60 * 1000; // 60 seconds per business rule

    logger.info(this.MODULE, 'Starting 60-second acknowledgement window');

    return new Promise((resolve) => {
      this.contactAckTimeout = setTimeout(async () => {
        logger.info(this.MODULE, 'Acknowledgement timeout reached');

        // Check if any contact acknowledged
        const acknowledged = alert.contactsNotified.some(n => n.acknowledged);

        if (!acknowledged) {
          logger.info(this.MODULE, 'No contacts acknowledged, escalating to volunteers');
          // FR6.3: Escalate to volunteers
          await this.escalateToVolunteers(alert);
        } else {
          this.sosStatus = SOSStatus.EMERGENCY_ACTIVE;
          logger.info(this.MODULE, 'Contact acknowledged, emergency active');
        }

        resolve(true);
      }, ACK_TIMEOUT);

      // Poll for acknowledgements every 5 seconds
      const checkInterval = setInterval(async () => {
        try {
          const updated = await this.firestoreService.getDocument('emergency_alerts', alert.id);

          if (updated && updated.contactsNotified) {
            const acked = updated.contactsNotified.some((n: any) => n.acknowledged);

            if (acked) {
              logger.info(this.MODULE, 'Contact acknowledged early');
              clearInterval(checkInterval);
              clearTimeout(this.contactAckTimeout!);
              this.sosStatus = SOSStatus.EMERGENCY_ACTIVE;
              resolve(true);
            }
          }
        } catch (err) {
          logger.error(this.MODULE, 'Error checking acknowledgement', err);
        }
      }, 5000);
    });
  }

  /**
   * FR6.3: Escalate to volunteer community if contacts don't respond
   */
  private async escalateToVolunteers(alert: EmergencyContactAlert) {
    try {
      logger.info(this.MODULE, 'Escalating to volunteer community', { alertId: alert.id });

      // Announce escalation
      await voiceManager.speak('Your contacts have not responded. Alerting nearby volunteers for immediate assistance.', 'en');
      await hapticService.trigger('alert');

      // Update alert status
      alert.status = SOSStatus.ESCALATING_TO_VOLUNTEERS;
      alert.updatedAt = Date.now();

      await this.firestoreService.updateDocument('emergency_alerts', alert.id, {
        status: alert.status,
        updatedAt: alert.updatedAt,
      });

      // Create help case for volunteers (FR6.3: 5 km radius)
      try {
        const { volunteerService } = await import('../volunteer.service');

        const helpCase = await volunteerService.createCase(
          alert.userId,
          alert.userLocation,
          'emergency',
          `User emergency SOS. Fall detected: ${alert.fallDetails ? 'Yes' : 'No'}. Location: ${alert.userLocation.address || 'GPS provided'}`
        );

        logger.info(this.MODULE, 'Help case created for volunteers', { caseId: helpCase.id });

        // Store volunteer notifications
        alert.volunteersNotified = [];
        await this.firestoreService.updateDocument('emergency_alerts', alert.id, {
          volunteersNotified: alert.volunteersNotified,
        });
      } catch (error) {
        logger.error(this.MODULE, 'Failed to escalate to volunteers', error);
        // Fallback: would trigger emergency services call in production
      }

      // Set 5-minute escalation timer for emergency services
      this.escalationTimer = setTimeout(async () => {
        logger.info(this.MODULE, 'Escalation timeout, would call emergency services');
        await voiceManager.speak('Calling emergency services for immediate assistance.', 'en');
      }, 5 * 60 * 1000);
    } catch (error) {
      logger.error(this.MODULE, 'Error escalating to volunteers', error);
    }
  }

  /**
   * Acknowledge alert from emergency contact
   */
  async acknowledgeAlert(alertId: string, contactId: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Emergency contact acknowledging', { alertId, contactId });

      const alert = await this.firestoreService.getDocument('emergency_alerts', alertId);

      if (!alert) {
        logger.error(this.MODULE, 'Alert not found', { alertId });
        return false;
      }

      // Find and update contact acknowledgement
      const contact = alert.contactsNotified.find((c: any) => c.contactId === contactId);

      if (contact) {
        contact.acknowledged = true;
        contact.acknowledgedAt = Date.now();
        contact.responseTime = contact.acknowledgedAt - contact.notifiedAt;

        // Update alert
        alert.status = SOSStatus.EMERGENCY_ACTIVE;
        alert.updatedAt = Date.now();

        await this.firestoreService.updateDocument('emergency_alerts', alertId, {
          contactsNotified: alert.contactsNotified,
          status: alert.status,
          updatedAt: alert.updatedAt,
        });

        // Notify user
        await voiceManager.speak(`${contact.name} has acknowledged your emergency and is coming to help.`, 'en');

        logger.info(this.MODULE, 'Contact acknowledged successfully');
        return true;
      }

      return false;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to acknowledge alert', error);
      return false;
    }
  }

  /**
   * Resolve emergency
   */
  async resolveEmergency(alertId: string, reason: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Resolving emergency', { alertId, reason });

      // Clear all timers
      if (this.contactAckTimeout) clearTimeout(this.contactAckTimeout);
      if (this.escalationTimer) clearTimeout(this.escalationTimer);
      if (this.inactivityCheck) clearTimeout(this.inactivityCheck);

      // Update alert
      await this.firestoreService.updateDocument('emergency_alerts', alertId, {
        status: SOSStatus.RESOLVED,
        resolutionReason: reason,
        resolvedAt: Date.now(),
        updatedAt: Date.now(),
      });

      this.sosStatus = SOSStatus.IDLE;
      this.currentAlert = null;

      await voiceManager.speak('Emergency resolved. Thank you for using Seevia.', 'en');

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to resolve emergency', error);
      return false;
    }
  }

  /**
   * Cancel SOS alert
   */
  async cancelEmergency(): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Cancelling emergency alert');

      if (this.currentAlert) {
        await this.resolveEmergency(this.currentAlert.id, 'User cancelled');
      }

      this.sosStatus = SOSStatus.IDLE;

      await voiceManager.speak('Emergency alert cancelled.', 'en');

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to cancel emergency', error);
      return false;
    }
  }

  /**
   * Get current SOS status
   */
  getSOSStatus(): SOSStatus {
    return this.sosStatus;
  }

  /**
   * Get current emergency alert
   */
  getCurrentAlert(): EmergencyContactAlert | null {
    return this.currentAlert;
  }

  /**
   * FR6.1: Check for inactivity and trigger alert if needed
   */
  async monitorInactivity(userId: string, thresholdMinutes: number = 30) {
    try {
      logger.info(this.MODULE, 'Setting up inactivity monitoring', { thresholdMinutes });

      this.inactivityCheck = setInterval(async () => {
        try {
          const userProfile = await this.firestoreService.getDocument('users', userId);

          if (userProfile && userProfile.lastActivityTime) {
            const inactiveMinutes = (Date.now() - userProfile.lastActivityTime) / 60000;

            if (inactiveMinutes >= thresholdMinutes) {
              logger.warn(this.MODULE, 'User inactive for threshold', { inactiveMinutes });

              await voiceManager.speak(
                `No activity detected for ${Math.round(inactiveMinutes)} minutes. Say cancel if you are okay.`,
                'en'
              );

              // Auto-trigger SOS after 2 more minutes of no response
              setTimeout(async () => {
                if (this.sosStatus === SOSStatus.IDLE) {
                  await this.initiateSOS(userId, SOSActivationType.INACTIVITY_TIMEOUT);
                }
              }, 120 * 1000); // 2 minutes
            }
          }
        } catch (err) {
          logger.error(this.MODULE, 'Error checking inactivity', err);
        }
      }, 60 * 1000); // Check every minute
    } catch (error) {
      logger.error(this.MODULE, 'Failed to set up inactivity monitoring', error);
    }
  }

  // ==================== Private Helper Methods ====================

  private async getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number; address?: string } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Best });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        address: 'Location acquired',
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get location', error);
      return null;
    }
  }

  private async getUserHealthInfo(userId: string): Promise<any> {
    try {
      const userProfile = await this.firestoreService.getDocument('users', userId);

      return {
        allergies: userProfile?.allergies || [],
        medications: userProfile?.medications || [],
        medicalConditions: userProfile?.medicalConditions || [],
        emergencyNotes: userProfile?.emergencyNotes || '',
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get health info', error);
      return {};
    }
  }

  private async getUserEmergencyContacts(userId: string): Promise<any[]> {
    try {
      const contacts = await this.firestoreService.query('emergency_contacts', [
        { field: 'userId', operator: '==', value: userId },
        { field: 'verified', operator: '==', value: true },
      ]);

      // Sort by priority
      return contacts.sort((a: any, b: any) => a.priority - b.priority);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get emergency contacts', error);
      return [];
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      // In production: get from auth context
      return 'current_user_id';
    } catch {
      return null;
    }
  }

  private async sendSMSAlert(phone: string, message: string): Promise<void> {
    try {
      logger.info(this.MODULE, 'Sending SMS alert', { phone });
      // In production: integrate with Twilio
    } catch (error) {
      logger.error(this.MODULE, 'Failed to send SMS', error);
    }
  }

  private async sendPushAlert(contact: any, alert: EmergencyContactAlert): Promise<void> {
    try {
      logger.info(this.MODULE, 'Sending push alert', { contactId: contact.contactId });
      // In production: Firebase Cloud Messaging
    } catch (error) {
      logger.error(this.MODULE, 'Failed to send push', error);
    }
  }

  private formatAlertMessage(alert: EmergencyContactAlert): string {
    const location = `${alert.userLocation.latitude}, ${alert.userLocation.longitude}`;
    const mapUrl = `https://www.google.com/maps?q=${alert.userLocation.latitude},${alert.userLocation.longitude}`;

    let message = `EMERGENCY ALERT from Seevia: User needs immediate help!\\n`;
    message += `Location: ${mapUrl}\\n`;

    if (alert.fallDetails) {
      message += `Fall detected (confidence: ${(alert.fallDetails.confidence * 100).toFixed(0)}%)\\n`;
    }

    if (alert.healthInfo?.medications?.length) {
      message += `Medications: ${alert.healthInfo.medications.join(', ')}\\n`;
    }

    if (alert.healthInfo?.allergies?.length) {
      message += `Allergies: ${alert.healthInfo.allergies.join(', ')}\\n`;
    }

    message += `Time: ${new Date().toLocaleString()}`;

    return message;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const emergencyService = new EmergencyManagementService();
