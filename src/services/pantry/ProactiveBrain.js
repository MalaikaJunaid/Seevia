export default class ProactiveBrain {
  /**
   * Calculates the stockout date based on historical consumption.
   */
  static calculateStockout(item) {
    const { current_stock, behavioral_metrics } = item;
    const consumptionRate = behavioral_metrics.avg_days_per_unit;

    if (consumptionRate <= 0) return null;

    const daysRemaining = current_stock * consumptionRate;
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + daysRemaining);

    return {
      date: stockoutDate,
      daysLeft: Math.round(daysRemaining),
      isCritical: daysRemaining <= 1.5 // 60% defense threshold
    };
  }
}
