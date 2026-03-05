/**
 * UsageLearner.js: The AI Engine for Module 3.
 * Uses a Weighted Moving Average to learn user consumption habits.
 */

export default class UsageLearner {
  /**
   * Updates the 'Learned Rate' based on new purchase data.
   * @param {number} oldRate - The previous average usage per day.
   * @param {number} newIntervalDays - Days since last restock.
   * @param {number} alpha - Learning rate (usually 0.2 to 0.3 for stability).
   */
  static trainRate(oldRate, newIntervalDays, quantity, alpha = 0.2) {
    const currentRate = quantity / newIntervalDays;
    
    // Formula: New Rate = (1 - alpha) * Old Rate + alpha * Current Rate
    // This allows the AI to adapt to lifestyle changes (e.g., guests at home)
    const updatedRate = ((1 - alpha) * oldRate) + (alpha * currentRate);
    
    return updatedRate.toFixed(2);
  }
}
