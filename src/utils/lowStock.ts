import { APP_CONFIG } from '@/src/constants/config';

/**
 * Seevia Inventory Intelligence
 * Predicts whether an item is low based on usage history rather than just fixed counts.
 */

export interface StockItem {
  quantity: number;
  usageHistory?: number[]; // Daily usage counts (e.g., [1, 0, 2, 1])
  lowStock?: boolean;
  predictedLowStockDate?: string | null;
}

/**
 * Predicts stock depletion using a rolling average of usage history.
 * @returns boolean indicating if the item is currently considered "Low Stock"
 */
export function predictLowStock(item: StockItem): boolean {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Guard: Ensure quantity is valid
  const q = Number(item?.quantity);
  if (!Number.isFinite(q) || q < 0) {
    item.lowStock = true;
    item.predictedLowStockDate = null;
    return true;
  }

  const rawHistory = Array.isArray(item.usageHistory) ? item.usageHistory : [];
  const history = rawHistory.filter(h => Number.isFinite(h) && h >= 0);

  // Fallback: If not enough data (< 3 entries), use a simple static threshold
  if (history.length < 3) {
    // Falls back to 1 unit or the global config
    item.lowStock = q <= (APP_CONFIG?.LOW_STOCK_THRESHOLD || 1);
    item.predictedLowStockDate = item.lowStock ? new Date().toISOString() : null;
    return Boolean(item.lowStock);
  }

  // Calculate Average Daily Usage
  const avgUsage = history.reduce((a, b) => a + b, 0) / history.length;

  // If usage is 0, item is effectively "infinite" or data is stale
  if (!Number.isFinite(avgUsage) || avgUsage <= 0) {
    item.lowStock = false;
    item.predictedLowStockDate = null;
    return false;
  }

  const daysRemaining = q / avgUsage;

  if (!Number.isFinite(daysRemaining)) {
    item.lowStock = false;
    item.predictedLowStockDate = null;
    return false;
  }

  // Set the predicted date for the UI/Notifications
  item.predictedLowStockDate =
    q === 0 
      ? new Date().toISOString() 
      : new Date(Date.now() + daysRemaining * MS_PER_DAY).toISOString();

  // Condition: Mark as low if it will run out within the threshold (e.g., 3 days)
  item.lowStock = daysRemaining <= (APP_CONFIG?.LOW_STOCK_THRESHOLD || 3) || q === 0;

  return Boolean(item.lowStock);
}
