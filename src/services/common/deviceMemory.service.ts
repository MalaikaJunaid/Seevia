import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

export interface DeviceMemory {
  deviceId: string;
  userEmail: string;
  lastLoginTime: number;
  isDeviceMemorized: boolean;
}

/**
 * DeviceMemoryService
 * Stores and retrieves device-specific authentication data for quick re-authentication
 * Uses AsyncStorage for all data (pure JavaScript, works with Expo Go)
 * Compatible with Expo SDK 49 and Expo Go
 */
class DeviceMemoryService {
  private static readonly MODULE = 'DEVICE_MEMORY_SERVICE';
  private static readonly DEVICE_ID_KEY = '@seevia_device_id';
  private static readonly DEVICE_MEMORY_KEY = '@seevia_device_memory';
  private static readonly AUTH_TOKEN_KEY = '@seevia_auth_token';
  private static readonly USER_EMAIL_KEY = '@seevia_user_email';

  /**
   * Generate a unique device ID (using timestamp + random)
   * In production, consider using react-native-device-info for more robust fingerprinting
   */
  private static generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remember this device after successful authentication
   * Stores device ID, user email, and auth token for quick re-authentication
   */
  static async rememberDevice(userEmail: string, authToken: string): Promise<void> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      
      // Generate device ID if this is first time
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        logger.info(this.MODULE, `New device registered: ${deviceId}`);
      }

      // Store device memory metadata in AsyncStorage
      const deviceMemory: DeviceMemory = {
        deviceId,
        userEmail,
        lastLoginTime: Date.now(),
        isDeviceMemorized: true,
      };

      await AsyncStorage.setItem(this.DEVICE_MEMORY_KEY, JSON.stringify(deviceMemory));
      await AsyncStorage.setItem(this.USER_EMAIL_KEY, userEmail);
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, authToken);

      logger.info(this.MODULE, `Device remembered for user: ${userEmail}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to remember device', error);
      // Don't throw - allow app to continue even if device memory fails
    }
  }

  /**
   * Check if this device is remembered
   */
  static async isDeviceMemorized(): Promise<boolean> {
    try {
      const memory = await AsyncStorage.getItem(this.DEVICE_MEMORY_KEY);
      return memory !== null;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to check device memory', error);
      return false;
    }
  }

  /**
   * Get stored device memory info
   */
  static async getDeviceMemory(): Promise<DeviceMemory | null> {
    try {
      const memory = await AsyncStorage.getItem(this.DEVICE_MEMORY_KEY);
      if (memory) {
        return JSON.parse(memory) as DeviceMemory;
      }
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get device memory', error);
      return null;
    }
  }

  /**
   * Get stored auth token for this device
   */
  static async getStoredAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
      if (token) {
        logger.info(this.MODULE, 'Retrieved auth token from AsyncStorage');
        return token;
      }
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get stored auth token', error);
      return null;
    }
  }

  /**
   * Get last remembered user email
   */
  static async getLastUserEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.USER_EMAIL_KEY);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get last user email', error);
      return null;
    }
  }

  /**
   * Clear all device memory (called on sign out)
   */
  static async forgetDevice(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.DEVICE_MEMORY_KEY,
        this.AUTH_TOKEN_KEY,
        this.USER_EMAIL_KEY,
      ]);
      
      logger.info(this.MODULE, 'Device memory cleared');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to forget device', error);
    }
  }

  /**
   * Get device ID
   */
  static async getDeviceId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.DEVICE_ID_KEY);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get device ID', error);
      return null;
    }
  }
}

export { DeviceMemoryService };
