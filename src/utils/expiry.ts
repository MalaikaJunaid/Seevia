import { APP_CONFIG } from '@/constants/config';
import { LIGHT_THEME } from '@/theme/colors'; // Make sure this path is correct for your project

/**
 * Seevia Expiry Logic Utility
 * Calculates time remaining and visual status for pantry items.
 */

export function computeDaysUntilExpiry(expiryDate?: Date | string | null) {
  if (!expiryDate) return undefined;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function getExpiryStatus(expiryDate?: Date | string | null) {
  const days = computeDaysUntilExpiry(expiryDate);
  
  if (days === undefined || isNaN(days)) {
    return { 
      label: 'Date Not Set', 
      color: LIGHT_THEME.textTertiary,
      status: 'none' 
    };
  }

  if (days < 0) {
    return { 
      label: 'Expired', 
      color: LIGHT_THEME.danger, 
      status: 'expired' 
    };
  }

  // Uses the warning threshold defined in config.ts (Usually 3 days)
  if (days <= (APP_CONFIG.EXPIRY_WARNING_DAYS || 3)) {
    return { 
      label: days === 0 ? 'Expires Today' : `Expires in ${days}d`, 
      color: LIGHT_THEME.warning, 
      status: 'warning' 
    };
  }

  return { 
    label: 'Fresh', 
    color: LIGHT_THEME.success, 
    status: 'fresh' 
  };
}