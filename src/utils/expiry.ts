import { APP_CONFIG } from '@/src/constants/config';
import { LIGHT_THEME } from '@/src/theme/colors';

/**
 * Seevia Expiry Logic Utility
 * Calculates time remaining and visual status for pantry items.
 */

export function computeDaysUntilExpiry(expiryDate?: Date | string) {
  if (!expiryDate) return undefined;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function getExpiryStatus(expiryDate?: Date | string) {
  const days = computeDaysUntilExpiry(expiryDate);
  
  if (days === undefined) {
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

  // Uses the 3-day threshold defined in config.ts
  if (days <= APP_CONFIG.EXPIRY_WARNING_DAYS) {
    return { 
      label: `Expires in ${days}d`, 
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
