/**
 * Seevia Validation Utility
 * Ensures data integrity for User Profiles, Emergency Contacts, and Pantry Items.
 */

export const validate = {
  /**
   * Validates Email format
   */
  email: (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  },

  /**
   * Validates Phone Numbers (Supports Pakistan +92 and UAE +971)
   */
  phone: (phone: string): boolean => {
    // Basic regex for 10-15 digits with optional plus sign
    const re = /^\+?(\d{10,15})$/;
    return re.test(phone.replace(/\s/g, ''));
  },

  /**
   * Ensures a string is not empty or just whitespace
   */
  required: (value: string): boolean => {
    return value.trim().length > 0;
  },

  /**
   * Validates Expiry Date (Must be today or in the future)
   */
  futureDate: (date: Date | string): boolean => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  },

  /**
   * Validates Password Strength (Min 6 chars for Seevia)
   */
  password: (password: string): boolean => {
    return password.length >= 6;
  },

  /**
   * Validates Quantity (Must be a positive number)
   */
  positiveNumber: (num: number): boolean => {
    return num > 0;
  }
};
