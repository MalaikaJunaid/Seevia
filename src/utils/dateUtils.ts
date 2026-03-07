/**
 * Seevia Date & Time Utilities
 * Provides accessible and localized formatting for pantry and emergency logs.
 */

export const dateUtils = {
  /**
   * Standard format: e.g., "Oct 24, 2025"
   */
  formatShort: (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  /**
   * Full format for speech: e.g., "October twenty-fourth, twenty-twenty-five"
   * Essential for Seevia's Voice Assistant to sound natural.
   */
  formatForSpeech: (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  },

  /**
   * Relative time: e.g., "Just now", "5 mins ago", "2 days ago"
   * Critical for the Emergency SOS history log.
   */
  getRelativeTime: (date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    
    return dateUtils.formatShort(date);
  },

  /**
   * Checks if a date is today
   */
  isToday: (date: Date | string): boolean => {
    const d = new Date(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }
};
