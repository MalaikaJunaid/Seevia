import { logger } from '@/utils/logger';
import { AuthService } from '../firebase/auth.service';
import { DeviceEventEmitter } from 'react-native';

// Standardized to the TextToSpeechService used across your other screens
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';

/**
 * UsageLearner: The Adaptive Learning Engine (Demo Edition).
 * Implements Exponential Smoothing and predictive stock analysis, 
 * directly wired to the Voice Orchestrator.
 */
class UsageLearnerImpl {
  private readonly MODULE = 'USAGE_LEARNER';

  /**
   * Initializes the background listener for the Voice Orchestrator.
   * Call UsageLearner.init() in your GlobalVoiceHandlers.tsx
   */
  init() {
    DeviceEventEmitter.addListener('TRIGGER_LOW_STOCK_CHECK', async () => {
      logger.info(this.MODULE, 'Voice trigger received for low stock check');
      
      try {
        const user = AuthService.getCurrentUser();
        if (!user) {
          await TextToSpeechService.speak("Aap logged in nahi hain. Stock check nahi ho sakta.");
          return;
        }

        const lowItems = await this.getLowStockPredictions(user.uid);
        
        if (lowItems.length > 0) {
          // Join the items nicely for the TTS
          const itemNames = lowItems.join(' aur ');
          await TextToSpeechService.speak(`Ahtiyat, aapke paas ${itemNames} khatam hone walay hain. Inhein apni shopping list mein shamil kar lein.`);
        } else {
          await TextToSpeechService.speak("Sab kuch theek lag raha hai, filhal koi item khatam nahi ho raha.");
        }

      } catch (error) {
        logger.error(this.MODULE, 'Failed to process low stock check', error);
        await TextToSpeechService.speak("Database check karne mein masla aaya, please baad mein try karein.");
      }
    });
    
    logger.info(this.MODULE, 'Low Stock Check Listener initialized.');
  }

  /**
   * Core algorithm: Learns a new consumption rate based on history.
   * @param oldRate The existing learned rate (units/day)
   * @param unitsConsumed Units used in the last interval
   * @param daysPassed Days since the last stock update
   * @param alpha Learning constant (0.1 = stable, 0.5 = fast learner)
   */
  learnNewRate(oldRate: number, unitsConsumed: number, daysPassed: number, alpha = 0.3): number {
    if (daysPassed <= 0) return oldRate;
    
    const currentObservedRate = unitsConsumed / daysPassed;
    
    // Formula: New Estimate = (1 - α) * Old Estimate + α * Current Observation
    const updatedRate = ((1 - alpha) * oldRate) + (alpha * currentObservedRate);
    
    return parseFloat(updatedRate.toFixed(3));
  }

  /**
   * THE DEMO CHEAT CODE: Proactive Stock Prediction
   * Scans the user's pantry and determines what is running low based on 
   * either hard thresholds (qty <= 1) OR predicted run-out time.
   */
  async getLowStockPredictions(userId: string): Promise<string[]> {
    try {
      logger.info(this.MODULE, 'Analyzing pantry consumption rates...');
      
      // 🛠️ FIXED: Dynamic Import breaks the Require Cycle while letting us use your original PantryService!
      const { PantryService } = await import('./pantry.service');
      const pantryItems = await PantryService.getPantryItems(userId);
      
      if (!pantryItems || pantryItems.length === 0) return [];

      const lowStockItems: string[] = [];

      for (const item of pantryItems) {
        const qty = item.quantity || 0;
        const name = item.nameUr || item.name || 'Unknown item';
        
        // Demo Heuristic 1: Hard threshold (1 or 0)
        if (qty <= (item.lowStockThreshold || 1)) {
          lowStockItems.push(name);
          continue;
        }

        // Demo Heuristic 2: Predictive depletion
        // We check avgDailyUsage (new standard) or fallback to behavioral_metrics
        const consumptionRate = item.avgDailyUsage || (item as any).behavioral_metrics?.learned_rate || 0;
        
        if (consumptionRate > 0) {
          const daysUntilEmpty = qty / consumptionRate;
          
          // If it will run out in less than 3 days, flag it!
          if (daysUntilEmpty <= 3) {
             lowStockItems.push(name);
          }
        }
      }

      // Deduplicate and return
      return [...new Set(lowStockItems)];
      
    } catch (error) {
      logger.error(this.MODULE, 'Failed to predict low stock', error);
      return [];
    }
  }
}

export const UsageLearner = new UsageLearnerImpl();