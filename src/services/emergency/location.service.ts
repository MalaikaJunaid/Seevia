import * as Location from 'expo-location';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Location Service
 * Manages GPS tracking, permissions, and reverse geocoding.
 */
class LocationService {
  private readonly MODULE = 'LOCATION_SERVICE';

  /**
   * Request all necessary location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        logger.warn(this.MODULE, 'Foreground location permission denied');
        return false;
      }

      // Background permission is critical for SOS while phone is locked
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus === 'granted';
    } catch (error) {
      logger.error(this.MODULE, 'Permission request failed', error);
      return false;
    }
  }

  /**
   * Get precise coordinates for Emergency/Shopping
   */
  async getCurrentPosition(): Promise<Location.LocationObject | null> {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get current position', error);
      return null;
    }
  }

  /**
   * Convert coordinates to a readable address
   */
  async getReadableAddress(lat: number, lon: number): Promise<string> {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });

      if (!address) return 'Unknown Location';

      return `${address.streetNumber || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
    } catch (error) {
      logger.error(this.MODULE, 'Reverse geocoding failed', error);
      return 'Coordinates: ' + lat + ', ' + lon;
    }
  }

  /**
   * Monitor location changes (Geofencing for Shopping reminders)
   */
  async watchLocation(callback: (location: Location.LocationObject) => void) {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      callback
    );
  }
}

export const locationService = new LocationService();
