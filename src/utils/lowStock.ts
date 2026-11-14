import { APP_CONFIG } from '@/constants/config';

export interface StockItem {
  quantity: number;
  usageHistory: number[]; // Array of units consumed per day. Oldest day at index 0, newest day at the end.
  lowStockThreshold?: number;
  predictedLowStockDate?: string | null;
}

/**
 * Uses a Lead-Time Demand formula and Weighted Moving Average 
 * to predict if an item will run out soon.
 */
export function predictLowStock(item: StockItem): boolean {
  const currentQty = Number(item.quantity);
  const history = (item.usageHistory || []).filter(n => n >= 0);

  // LOGIC: If no history, use static threshold
  if (history.length < 3) {
    return currentQty <= (item.lowStockThreshold || APP_CONFIG.LOW_STOCK_THRESHOLD || 1);
  }

  // AI LOGIC: Calculate Weighted Moving Average (giving more weight to recent days)
  // Recent usage is a better predictor of the immediate future.
  const totalWeight = (history.length * (history.length + 1)) / 2;
  let weightedSum = 0;
  
  history.forEach((usage, index) => {
    // index + 1 ensures the most recent day (end of array) gets the highest multiplier
    weightedSum += usage * (index + 1);
  });

  const avgUsage = weightedSum / totalWeight;

  // If they aren't using the item at all, it's not going to run out
  if (avgUsage <= 0) return false;

  const daysRemaining = currentQty / avgUsage;

  // Optional: Set Prediction Date on the object
  // (Be careful mutating props directly if passing React state objects)
  const prediction = new Date();
  prediction.setDate(prediction.getDate() + daysRemaining);
  item.predictedLowStockDate = prediction.toISOString();

  // CRITICAL THRESHOLD: Mark as low if stock lasts less than 3 days 
  // or is currently below safety stock (avgUsage * 1.5 days of buffer)
  const isCritical = daysRemaining <= 3 || currentQty <= (avgUsage * 1.5);
  
  return isCritical;
}