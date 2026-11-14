/**
 * Seevia Emergency Log Trigger Service
 * Manages creation of emergency_logs documents when fall detection is triggered
 * Integrates with accelerometer data and creates Firebase records for caregiver alerts
 */

import { logger } from '@/utils/logger';
import { FirestoreService } from '../firebase/firestore.service';
import * as Location from 'expo-location';

export interface EmergencyLogData {
  id: string;
  userId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  type: 'fall' | 'manual_sos';
  status: 'active' | 'resolved';
  fallDetails?: {
    accelerationMagnitude: number;
    phase: string;
    confidence: number;
    angularVelocity: number;
  };
  caregiverId?: string;
  notificationSent: boolean;
  createdAt: number;
  updatedAt: number;
}

class EmergencyLogTriggerService {
  private readonly MODULE = 'EMERGENCY_LOG_TRIGGER';
  private firestoreService = new FirestoreService();
  private activeEmergencyLogId: string | null = null;

  /**
   * Create an emergency log when accelerometer detects a fall
   * This is the primary trigger for emergency escalation
   */
  async createFallEmergencyLog(
    userId: string,
    fallData: {
      accelerationMagnitude: number;
      phase: string;
      confidence: number;
      angularVelocity: number;
    },
    caregiverId?: string
  ): Promise<EmergencyLogData | null> {
    try {
      logger.info(this.MODULE, 'Creating emergency log for fall detection', {
        userId,
        confidence: fallData.confidence,
      });

      // Get current location
      const location = await this.getCurrentLocation();
      if (!location) {
        logger.error(this.MODULE, 'Failed to get location for emergency log');
        return null;
      }

      // Generate unique ID for this emergency log
      const logId = this.generateEmergencyLogId();

      // Create emergency log document
      const emergencyLog: EmergencyLogData = {
        id: logId,
        userId,
        timestamp: Date.now(),
        location,
        type: 'fall',
        status: 'active',
        fallDetails: fallData,
        caregiverId,
        notificationSent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Save to Firestore
      await this.firestoreService.setDocument('emergency_logs', logId, emergencyLog);

      logger.info(this.MODULE, 'Emergency log created successfully', { logId, userId });

      // Store current emergency log ID for reference
      this.activeEmergencyLogId = logId;

      return emergencyLog;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to create emergency log', error);
      return null;
    }
  }

  /**
   * Create a manual SOS emergency log
   */
  async createManualSOSLog(userId: string, caregiverId?: string): Promise<EmergencyLogData | null> {
    try {
      logger.info(this.MODULE, 'Creating manual SOS emergency log', { userId });

      const location = await this.getCurrentLocation();
      if (!location) {
        logger.error(this.MODULE, 'Failed to get location for manual SOS log');
        return null;
      }

      const logId = this.generateEmergencyLogId();

      const emergencyLog: EmergencyLogData = {
        id: logId,
        userId,
        timestamp: Date.now(),
        location,
        type: 'manual_sos',
        status: 'active',
        caregiverId,
        notificationSent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.firestoreService.setDocument('emergency_logs', logId, emergencyLog);

      logger.info(this.MODULE, 'Manual SOS log created', { logId });

      this.activeEmergencyLogId = logId;

      return emergencyLog;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to create manual SOS log', error);
      return null;
    }
  }

  /**
   * Mark notification as sent for this emergency log
   */
  async markNotificationSent(logId: string): Promise<boolean> {
    try {
      await this.firestoreService.updateDocument('emergency_logs', logId, {
        notificationSent: true,
        updatedAt: Date.now(),
      });

      logger.info(this.MODULE, 'Marked notification as sent', { logId });
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to mark notification sent', error);
      return false;
    }
  }

  /**
   * Resolve an emergency log
   */
  async resolveEmergencyLog(logId: string, reason: string = 'resolved'): Promise<boolean> {
    try {
      await this.firestoreService.updateDocument('emergency_logs', logId, {
        status: 'resolved',
        updatedAt: Date.now(),
      });

      logger.info(this.MODULE, 'Emergency log resolved', { logId, reason });

      if (logId === this.activeEmergencyLogId) {
        this.activeEmergencyLogId = null;
      }

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to resolve emergency log', error);
      return false;
    }
  }

  /**
   * Get current active emergency log
   */
  getActiveEmergencyLogId(): string | null {
    return this.activeEmergencyLogId;
  }

  /**
   * Get emergency log by ID
   */
  async getEmergencyLog(logId: string): Promise<EmergencyLogData | null> {
    try {
      const log = await this.firestoreService.getDocument('emergency_logs', logId);
      return log as EmergencyLogData | null;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get emergency log', error);
      return null;
    }
  }

  /**
   * Get all active emergency logs for a user
   */
  async getActiveLogsForUser(userId: string): Promise<EmergencyLogData[]> {
    try {
      const logs = await this.firestoreService.queryDocuments('emergency_logs', [
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'active' },
      ]);

      return logs as EmergencyLogData[];
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get active logs for user', error);
      return [];
    }
  }

  // ==================== Private Helper Methods ====================

  private async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Best,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        address: 'Location acquired',
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get current location', error);
      return null;
    }
  }

  private generateEmergencyLogId(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const emergencyLogTriggerService = new EmergencyLogTriggerService();
