import { PantryItem } from '@/models/PantryItem';
import { getExpiryStatus } from '@/utils/expiry';
import { APP_CONFIG } from '@/constants/config';
import { logger } from '@/utils/logger';
import { DeviceEventEmitter } from 'react-native';
import { AuthService } from '../firebase/auth.service';
import { PantryService } from './pantry.service';
// @ts-ignore
import TtsService from '../voice/TtsService';

/**
 * Seevia Expiry Service
 * Background logic for monitoring food safety across the entire pantry.
 * Centralizes detection of expired and expiring soon items.
 */
class ExpiryService {
  private readonly MODULE = 'EXPIRY_SERVICE';

  /**
   * Initializes the background listener for the Voice Orchestrator.
   * Call expiryService.init() in your GlobalVoiceHandlers.tsx
   */
  init() {
    DeviceEventEmitter.addListener('TRIGGER_EXPIRY_CHECK', async () => {
      logger.info(this.MODULE, 'Voice trigger received for expiry check');
      
      try {
        const user = AuthService.getCurrentUser();
        if (!user) {
          TtsService.speak("Aap logged in nahi hain. Expiry check nahi ho sakta.");
          return;
        }

        // Fetch live pantry items
        const items = await PantryService.getPantryItems(user.uid);
        
        if (!items || items.length === 0) {
          TtsService.speak("Aap ki pantry abhi khali hai. Kuch add karein.");
          return;
        }

        const summary = this.getExpirySummaryForVoice(items);
        TtsService.speak(summary);

      } catch (error) {
        logger.error(this.MODULE, 'Failed to process expiry check trigger', error);
        TtsService.speak("Database check karne mein masla aaya, please internet check karein.");
      }
    });
    
    logger.info(this.MODULE, 'Expiry Check Listener initialized.');
  }

  /**
   * Check expiry status for a single item.
   * Returns structured status for UI components like PantryCard.
   */
  checkExpiryStatus(item: PantryItem) {
    try {
      // 🛠️ FIX: Fallback to undefined if item.expiryDate is null
      const status = getExpiryStatus(item.expiryDate || undefined);
      return {
        isExpired: status.status === 'expired',
        isExpiringSoon: status.status === 'warning',
        message: status.label,
        color: status.color,
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to check expiry status', error);
      return {
        isExpired: false,
        isExpiringSoon: false,
        message: 'Status unknown',
        color: '#999999',
      };
    }
  }

  /**
   * Filters a list of items to find those that are already expired.
   */
  getExpiredItems(items: PantryItem[]): PantryItem[] {
    return items.filter(item => {
      // 🛠️ FIX: Fallback to undefined if item.expiryDate is null
      const status = getExpiryStatus(item.expiryDate || undefined);
      return status.status === 'expired';
    });
  }

  /**
   * Filters items that will expire within the configured warning threshold.
   */
  getUpcomingExpiries(items: PantryItem[]): PantryItem[] {
    return items.filter(item => {
      // 🛠️ FIX: Fallback to undefined if item.expiryDate is null
      const status = getExpiryStatus(item.expiryDate || undefined);
      return status.status === 'warning';
    });
  }

  /**
   * Generates a highly specific natural language summary for the Voice Assistant in Roman Urdu.
   * Helps visually impaired users understand their pantry's health status.
   */
  getExpirySummaryForVoice(items: PantryItem[]): string {
    const expired = this.getExpiredItems(items);
    const upcoming = this.getUpcomingExpiries(items);

    // Everything is good
    if (expired.length === 0 && upcoming.length === 0) {
      return "Pantry mein majood tamam items fresh hain, kuch bhi kharab nahi ho raha.";
    }

    let report = "";
    
    // Announce Expired Items (Read out up to 2 specific names for clarity)
    if (expired.length > 0) {
      const names = expired.slice(0, 2).map(i => i.name).join(' aur ');
      const extraCount = expired.length > 2 ? ` aur ${expired.length - 2} mazeed items` : '';
      report += `Ahtiyat, aap ka ${names}${extraCount} expire ho chuka hai. Isay bilkul istemal mat karein. `;
    }
    
    // Announce Expiring Soon Items (Anti-Waste)
    if (upcoming.length > 0) {
      const names = upcoming.slice(0, 2).map(i => i.name).join(' aur ');
      const extraCount = upcoming.length > 2 ? ` aur ${upcoming.length - 2} mazeed items` : '';
      report += `${names}${extraCount} jald expire hone wale hain, inhein pehle istemal kar lein taa ke zaya na ho.`;
    }

    return report;
  }
}

export const expiryService = new ExpiryService();