/**
 * Caregiver Emergency Listener Hook
 * Manages real-time emergency alerts for caregivers
 * Provides control over alarm, notifications, and alert management
 */

import { useEffect, useState, useCallback } from 'react';
import {
  caregiverEmergencyListenerService,
  type EmergencyListenerConfig,
} from '@/services/emergency/caregiverEmergencyListener.service';
import { logger } from '@/utils/logger';

interface UseCaregiverEmergencyListenerReturn {
  isListening: boolean;
  activeAlerts: any[];
  error: string | null;
  startListening: (linkedPwdIds: string[]) => Promise<void>;
  stopListening: () => Promise<void>;
  acknowledgeEmergency: (logId: string) => Promise<void>;
  dismissEmergency: (logId: string, reason?: string) => Promise<void>;
  stopAlarm: (logId: string) => Promise<void>;
}

/**
 * Hook for caregivers to listen for PWD emergencies
 * Usage:
 * const { isListening, activeAlerts, acknowledgeEmergency } = useCaregiverEmergencyListener();
 *
 * useEffect(() => {
 *   startListening([pwdId]);
 * }, [pwdId]);
 */
export const useCaregiverEmergencyListener = (
  caregiverId: string
): UseCaregiverEmergencyListenerReturn => {
  const [isListening, setIsListening] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize listener on mount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isListening) {
        caregiverEmergencyListenerService.shutdown();
      }
    };
  }, [isListening]);

  const startListening = useCallback(
    async (linkedPwdIds: string[]) => {
      try {
        logger.info('CAREGIVER_LISTENER_HOOK', 'Starting emergency listener', {
          caregiverId,
          pwdCount: linkedPwdIds.length,
        });

        const config: EmergencyListenerConfig = {
          caregiverId,
          linkedPwdIds,
          enableVibration: true,
          enableSound: true,
          enableNotification: true,
        };

        const success = await caregiverEmergencyListenerService.initialize(config);

        if (success) {
          setIsListening(true);
          setError(null);
          logger.info('CAREGIVER_LISTENER_HOOK', 'Emergency listener started');
        } else {
          setError('Failed to start emergency listener');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start listening';
        setError(message);
        logger.error('CAREGIVER_LISTENER_HOOK', 'Error starting listener', err);
      }
    },
    [caregiverId]
  );

  const stopListening = useCallback(async () => {
    try {
      logger.info('CAREGIVER_LISTENER_HOOK', 'Stopping emergency listener');

      await caregiverEmergencyListenerService.shutdown();
      setIsListening(false);
      setActiveAlerts([]);
      setError(null);

      logger.info('CAREGIVER_LISTENER_HOOK', 'Emergency listener stopped');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop listening';
      setError(message);
      logger.error('CAREGIVER_LISTENER_HOOK', 'Error stopping listener', err);
    }
  }, []);

  const acknowledgeEmergency = useCallback(async (logId: string) => {
    try {
      await caregiverEmergencyListenerService.acknowledgeEmergency(logId);
      // Update active alerts
      const alerts = caregiverEmergencyListenerService.getActiveAlerts();
      setActiveAlerts(alerts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to acknowledge emergency';
      setError(message);
      logger.error('CAREGIVER_LISTENER_HOOK', 'Error acknowledging emergency', err);
    }
  }, []);

  const dismissEmergency = useCallback(async (logId: string, reason?: string) => {
    try {
      await caregiverEmergencyListenerService.dismissEmergency(logId, reason);
      const alerts = caregiverEmergencyListenerService.getActiveAlerts();
      setActiveAlerts(alerts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss emergency';
      setError(message);
      logger.error('CAREGIVER_LISTENER_HOOK', 'Error dismissing emergency', err);
    }
  }, []);

  const stopAlarm = useCallback(async (logId: string) => {
    try {
      await caregiverEmergencyListenerService.stopAlarmSound(logId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop alarm';
      setError(message);
      logger.error('CAREGIVER_LISTENER_HOOK', 'Error stopping alarm', err);
    }
  }, []);

  return {
    isListening,
    activeAlerts,
    error,
    startListening,
    stopListening,
    acknowledgeEmergency,
    dismissEmergency,
    stopAlarm,
  };
};
