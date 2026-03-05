/**
 * ConsumptionPredictor.js: Behavioral Pattern Analysis for Seevia.
 * Learns user habits to predict when stock runs out.
 */

export default class ConsumptionPredictor {
  /**
   * Calculates days remaining for a product.
   * @param {number} currentQuantity - Current units in pantry.
   * @param {number} averageDailyUsage - Learned from historical purchase data.
   */
  static predictDepletion(currentQuantity, averageDailyUsage) {
    if (averageDailyUsage <= 0) return Infinity;
    
    const daysRemaining = currentQuantity / averageDailyUsage;
    
    // Threshold: Notify if less than 1.5 days of stock remains
    return {
      daysRemaining: Math.round(daysRemaining),
      needsRestock: daysRemaining <= 1.5
    };
  }
}
