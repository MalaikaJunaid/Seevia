import { PantryItem } from '@/models/PantryItem';

export interface StockoutPrediction {
  date: Date | null;
  daysLeft: number | null;
  isCritical: boolean;
}

/**
 * ProactiveBrain: The predictive engine for Seevia.
 * Calculates exactly when an item will run out based on historical consumption
 * and triggers proactive warnings before the user is left stranded.
 */
export default class ProactiveBrain {
  
  /**
   * Calculates the exact stockout date based on historical consumption.
   * 
   * @param item The PantryItem to analyze
   * @returns StockoutPrediction object with dates and criticality flags
   */
  static calculateStockout(item: PantryItem): StockoutPrediction {
    const currentStock = item.quantity || 0;
    
    // avgDailyUsage = units consumed per day (e.g., 0.5 means half a carton a day)
    const consumptionRate = item.avgDailyUsage || 0;

    // If we have no data, or it's already empty
    if (consumptionRate <= 0 || currentStock <= 0) {
      return {
        date: null,
        daysLeft: currentStock <= 0 ? 0 : null,
        isCritical: currentStock <= 0 
      };
    }

    // Math: 2 cartons / 0.5 cartons per day = 4 days remaining
    const daysRemaining = currentStock / consumptionRate;
    
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + daysRemaining);

    return {
      date: stockoutDate,
      daysLeft: Math.round(daysRemaining),
      isCritical: daysRemaining <= 1.5 // The 60% defense threshold from your research
    };
  }

  /**
   * 🗣️ Demo Cheat Code: Generates a natural Roman Urdu warning 
   * for the Voice Orchestrator if the item is critical.
   */
  static getVoiceWarning(item: PantryItem): string | null {
    const prediction = this.calculateStockout(item);
    const itemName = item.nameUr || item.name; // Prefer Urdu name if available

    if (prediction.isCritical) {
      if (prediction.daysLeft === 0 || item.quantity === 0) {
        return `Aapka ${itemName} bilkul khatam ho gaya hai.`;
      }
      return `Ahtiyat, ${itemName} aglay dedh din mein khatam hone wala hai.`;
    }

    return null; // No warning needed, stock is healthy
  }
}