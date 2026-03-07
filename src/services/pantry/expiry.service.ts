import { PantryItem } from '@/src/models/PantryItem';
import { getExpiryStatus } from '@/src/utils/expiry';
import { APP_CONFIG } from '@/src/constants/config';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Expiry Service
 * Background logic for monitoring food safety across the entire pantry.
 */
class ExpiryService {
  private readonly MODULE = 'EXPIRY_SERVICE';

  /**
   * Filters a list of items to find those that are already expired.
   */
  getExpiredItems(items: PantryItem[]): PantryItem[] {
    return items.filter(item => {
      const status = getExpiryStatus(item.expiryDate);
      return status.status === 'expired';
    });
  }

  /**
   * Filters items that will expire within the configured warning threshold (e.g., 3 days).
   */
  getUpcomingExpiries(items: PantryItem[]): PantryItem[] {
    return items.filter(item => {
      const status = getExpiryStatus(item.expiryDate);
      return status.status === 'warning';
    });
  }

  /**
   * Generates a natural language summary for the Voice Assistant.
   * Example: "You have 2 items expired and 3 items expiring soon, including Milk."
   */
  getExpirySummaryForVoice(items: PantryItem[]): string {
    const expired = this.getExpiredItems(items);
    const upcoming = this.getUpcomingExpiries(items);

    if (expired.length === 0 && upcoming.length === 0) {
      return "All your pantry items are fresh.";
    }

    let report = "";
    if (expired.length > 0) {
      report += `You have ${expired.length} expired ${expired.length === 1 ? 'item' : 'items'}. `;
    }
    if (upcoming.length > 0) {
      report += `There are ${upcoming.length} items expiring soon. `;
      if (upcoming.length > 0) {
        report += `Specifically, your ${upcoming[0].name} needs to be used.`;
      }
    }

    return report;
  }
}

export const expiryService = new ExpiryService();
