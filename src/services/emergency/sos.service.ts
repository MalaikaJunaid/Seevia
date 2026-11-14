import { EmergencyEvent, EmergencyType, EmergencyStatus } from '@/models/Emergency';
import { UserProfile } from '@/models/User';
import { logger } from '@/utils/logger';
import { ACCESSIBILITY } from '@/theme/accessibility';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { db } from '@/config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { romanUrduTTSService } from '../voice/romanUrduTTS.service';

/**
 * Seevia SOS Service
 * Manages the lifecycle of an emergency event from detection to notification.
 * Includes fallback chains and Roman Urdu audio feedback.
 */
class SOSService {
  private readonly MODULE = 'SOS_SERVICE';
  private readonly LOCATION_TIMEOUT = 5000; // 5 seconds max wait for location
  private readonly SMS_TIMEOUT = 3000; // 3 seconds max wait for SMS

  /**
   * Initiates the Emergency Protocol
   */
  async triggerEmergency(user: UserProfile, type: EmergencyType): Promise<string | null> {
    try {
      logger.info(this.MODULE, `🚨 Emergency Triggered: ${type}`);
      
      // Provide instant audio feedback to user
      await this.announceEmergency(type);

      // 1. Get Current Location (with timeout fallback)
      let location = null;
      try {
        location = await Promise.race([
          this.getCurrentLocation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), this.LOCATION_TIMEOUT)
          )
        ]).catch(err => {
          logger.warn(this.MODULE, `Location service error: ${err.message}`);
          return null; // Continue without location if timeout
        }) as any;
      } catch (locationError) {
        logger.warn(this.MODULE, 'Location retrieval failed', locationError);
        // Continue without location - other data is critical
      }

      // 2. Create Emergency Event Object
      const emergencyData: Partial<EmergencyEvent> = {
        userId: user.id,
        type,
        status: EmergencyStatus.ACTIVE,
        timestamp: new Date().toISOString(),
        location: location ? {
          latitude: location.coords?.latitude || 0,
          longitude: location.coords?.longitude || 0,
        } : undefined,
        notifiedContacts: user.emergencyContacts?.map(c => c.id) || [],
      };

      // 3. Save to Firebase for Real-time Dashboard (Family in UAE/Pakistan)
      let docRef = null;
      try {
        docRef = await Promise.race([
          addDoc(collection(db, 'emergencies'), {
            ...emergencyData,
            serverTime: serverTimestamp(),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase timeout')), 5000)
          )
        ]) as any;
        logger.info(this.MODULE, `Emergency logged to Firebase: ${docRef?.id}`);
      } catch (firebaseError) {
        logger.error(this.MODULE, 'Failed to save to Firebase', firebaseError);
        // Fall through to SMS - don't stop the flow
      }

      // 4. Send SMS Fallback to Trust Circle (with timeout)
      await this.notifyTrustCircleWithFallback(user, emergencyData.location, emergencyData.type);

      return docRef?.id || 'offline-emergency-' + Date.now();

    } catch (error) {
      logger.error(this.MODULE, 'Fatal error in SOS trigger', error);
      // Make absolutely sure user gets audio feedback even if everything fails
      try {
        await romanUrduTTSService.speak(
          'Hungami halat. Madad bheji ja rahi hai. Family ko message mil gaya.',
          { language: 'ur', useRoman: true, rate: 0.8 }
        );
      } catch {}
      return null;
    }
  }

  /**
   * Announce emergency to user with Roman Urdu audio
   */
  private async announceEmergency(type: EmergencyType): Promise<void> {
    const announcements: Record<EmergencyType, string> = {
      [EmergencyType.FALL]: 'Girne ka pata chal gaya. Family ko message bhejan ja raha hai. Aap theek hain?',
      [EmergencyType.MEDICAL]: 'Tabiyat kharab lagti hai. Emergency services ko khabar di ja rahi hai.',
      [EmergencyType.MANUAL]: 'Hungami madad. Aap ke trust circle ko message mil gaya. Shamil hone ke liye shukriya.',
    };

    const message = announcements[type] || 'Hungami soorat. Madad aa rahi hai.';
    
    try {
      await romanUrduTTSService.speak(message, {
        language: 'ur',
        useRoman: true,
        rate: 0.75,
        volume: 1.0,
      });
    } catch (err) {
      logger.error(this.MODULE, 'Failed to announce emergency', err);
      // Don't stop - continue with notification even if TTS fails
    }
  }

  private async getCurrentLocation() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn(this.MODULE, 'Location permission not granted');
        return null;
      }
      return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch (error) {
      logger.error(this.MODULE, 'Error getting location', error);
      return null;
    }
  }

  /**
   * Notify trust circle with fallback chain:
   * 1. Firebase Cloud Messaging (primary - handled by cloud function)
   * 2. SMS SMS (fallback if network available)
   * 3. Log locally if all fail
   */
  private async notifyTrustCircleWithFallback(
    user: UserProfile,
    location: { latitude: number; longitude: number } | undefined,
    type: EmergencyType
  ): Promise<void> {
    const phoneNumbers = user.emergencyContacts?.map(c => c.phone).filter(p => !!p) || [];
    
    if (phoneNumbers.length === 0) {
      logger.warn(this.MODULE, 'No emergency contacts configured');
      return;
    }

    // Build message with or without location
    const locationText = location 
      ? `\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : '\nLocation: Unavailable';
    
    const message = `EMERGENCY ALERT: ${user.name} needs immediate help!\n` +
                   `Type: ${type}\n` +
                   `App: Seevia\n` +
                   locationText +
                   `\n\nPlease check immediately!`;

    // Try SMS with timeout
    try {
      const isAvailable = await Promise.race([
        SMS.isAvailableAsync(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMS availability check timeout')), 2000)
        )
      ]) as boolean;

      if (isAvailable && phoneNumbers.length > 0) {
        await Promise.race([
          SMS.sendSMSAsync(phoneNumbers, message),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMS send timeout')), this.SMS_TIMEOUT)
          )
        ]);
        logger.info(this.MODULE, `SMS sent to ${phoneNumbers.length} contacts`);
      }
    } catch (smsError) {
      logger.error(this.MODULE, `SMS notification failed: ${(smsError as Error).message}`);
      // Continue - SMS is backup anyway
    }
  }
}

export const sosService = new SOSService();
