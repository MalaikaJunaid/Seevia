import { useEffect, useState, useCallback } from 'react';
import {
  emergencyService,
  type EmergencyContactAlert,
  type SOSStatus,
  type SOSActivationType,
} from '@/services/emergency/emergency.service';
import { useAccessibility } from './useAccessibility';

interface UseEmergencyReturn {
  status: SOSStatus;
  alert: EmergencyContactAlert | null;
  isLoading: boolean;
  error: string | null;
  triggerSOS: (type: SOSActivationType) => Promise<void>;
  cancelSOS: (reason?: string) => Promise<void>;
  acknowledgeAlert: (contactId: string) => Promise<void>;
  currentAlert: EmergencyContactAlert | null;
  getAlertHistory: () => Promise<EmergencyContactAlert[]>;
  updateFallDetectionSettings: (settings: any) => Promise<void>;
  getFallDetectionSettings: () => Promise<any>;
}

/**
 * Hook for managing emergency SOS functionality
 * Provides real-time status, alert management, and integration with accessibility
 */
export const useEmergency = (): UseEmergencyReturn => {
  const [status, setStatus] = useState<SOSStatus>('idle');
  const [alert, setAlert] = useState<EmergencyContactAlert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { announce } = useAccessibility();

  // Initialize fall detection monitoring on mount
  useEffect(() => {
    const initializeEmergency = async () => {
      try {
        await emergencyService.startInactivityMonitoring(30);
        announce('Emergency system initialized');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize emergency system';
        setError(message);
        announce(`Emergency system error: ${message}`);
      }
    };

    initializeEmergency();

    // Cleanup on unmount
    return () => {
      // Emergency service cleanup handled in service
    };
  }, [announce]);

  const triggerSOS = useCallback(
    async (type: SOSActivationType = 'manual_button') => {
      setIsLoading(true);
      setError(null);

      try {
        announce(`Triggering SOS via ${type}`);

        switch (type) {
          case 'voice_command':
            await emergencyService.triggerSOSByVoiceCommand();
            break;
          case 'motion_gesture':
            await emergencyService.triggerSOSByMotion(true);
            break;
          default:
            await emergencyService.initiateSOS(type);
        }

        setStatus('triggered');
        announce('SOS activated. Emergency contacts notified.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to trigger SOS';
        setError(message);
        announce(`SOS failed: ${message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [announce]
  );

  const cancelSOS = useCallback(
    async (reason?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!alert?.alertId) {
          announce('No active emergency to cancel');
          return;
        }

        await emergencyService.cancelEmergency(alert.alertId, reason);
        setStatus('idle');
        setAlert(null);
        announce('Emergency cancelled');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel emergency';
        setError(message);
        announce(`Cancel failed: ${message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [alert?.alertId, announce]
  );

  const acknowledgeAlert = useCallback(
    async (contactId: string) => {
      if (!alert?.alertId) return;

      try {
        await emergencyService.acknowledgeAlert(alert.alertId, contactId);
        announce(`Contact ${contactId} acknowledged emergency`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to acknowledge alert';
        announce(`Acknowledgement failed: ${message}`);
      }
    },
    [alert?.alertId, announce]
  );

  const getAlertHistory = useCallback(async () => {
    try {
      return await emergencyService.getAlertHistory(50);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve history';
      setError(message);
      return [];
    }
  }, []);

  const updateFallDetectionSettings = useCallback(async (settings: any) => {
    try {
      await emergencyService.updateFallDetectionSettings(settings);
      announce('Fall detection settings updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      announce(`Settings update failed: ${message}`);
    }
  }, [announce]);

  const getFallDetectionSettings = useCallback(async () => {
    try {
      return await emergencyService.getFallDetectionSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve settings';
      setError(message);
      return null;
    }
  }, []);

  return {
    status,
    alert,
    isLoading,
    error,
    triggerSOS,
    cancelSOS,
    acknowledgeAlert,
    currentAlert: alert,
    getAlertHistory,
    updateFallDetectionSettings,
    getFallDetectionSettings,
  };
};
