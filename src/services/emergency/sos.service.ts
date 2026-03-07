import { EmergencyEvent, EmergencyType, EmergencyStatus } from '@/src/models/Emergency';
import { UserProfile } from '@/src/models/User';
import { logger } from '@/src/utils/logger';
import { ACCESSIBILITY } from '@/src/theme/accessibility';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { db } from '@/src/services/firebase/config'; // Your Firebase config
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Seevia SOS Service
 * Manages the lifecycle of an emergency event from detection to notification.
 */
class SOSService {
  private readonly MODULE = 'SOS_SERVICE';

  /**
   * Initiates the Emergency Protocol
   */
  async triggerEmergency(user: UserProfile, type: EmergencyType): Promise<string | null> {
    try {
      logger.info(this.MODULE, `Emergency Triggered: ${type}`);

      // 1. Get Current Location
      const location = await this.getCurrentLocation();
      
      // 2. Create Emergency Event Object
      const emergencyData: Partial<EmergencyEvent> = {
        userId: user.id,
        type,
        status: EmergencyStatus.ACTIVE,
        timestamp: new Date().toISOString(),
        location: {
          latitude: location?.coords.latitude || 0,
          longitude: location?.coords.longitude || 0,
        },
        notifiedContacts: user.emergencyContacts.map(c => c.id),
      };

      // 3. Save to Firebase for Real-time Dashboard (Family in UAE/Pakistan)
      const docRef = await addDoc(collection(db, 'emergencies'), {
        ...emergencyData,
        serverTime: serverTimestamp(),
      });

      // 4. Send SMS Fallback to Trust Circle
      await this.notifyTrustCircle(user, emergencyData.location!);

      return docRef.id;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to trigger SOS', error);
      return null;
    }
  }

  private async getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  }

  private async notifyTrustCircle(user: UserProfile, loc: { latitude: number, longitude: number }) {
    const googleMapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
    const message = `EMERGENCY ALERT: ${user.name} needs help! Location: ${googleMapsUrl}. Sent via Seevia App.`;

    const phoneNumbers = user.emergencyContacts.map(c => c.phone);
    
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable && phoneNumbers.length > 0) {
      await SMS.sendSMSAsync(phoneNumbers, message);
    }
  }
}

export const sosService = new SOSService();
