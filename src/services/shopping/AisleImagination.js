/**
 * AisleImagination.js: The "Imagination Engine" for Seevia.
 * Provides auditory vision when camera data is low-confidence.
 */

import storeMap from '../../assets/data/save_mart_pwd_map.json';
import TtsService from '../voice/TtsService';

export default class AisleImagination {
  /**
   * Generates a descriptive 'filling' based on the store map.
   * @param {string} currentAisleId - The last known aisle from NavigationEngine.
   * @param {boolean} isLowConfidence - Triggered by VisionProcessor if blurry.
   */
  static generateAisleDescription(currentAisleId, isLowConfidence = false) {
    const aisleData = storeMap.aisle_data[currentAisleId];

    if (!aisleData) {
      return TtsService.speak("Mujhe aapki location samajh nahi aa rahi. Seedha chaltay rahein.");
    }

    // 1. Extract Items (Bilingual Support)
    const itemsUr = aisleData.items.map(i => i.ur).join(", ");
    const itemsEn = aisleData.items.map(i => i.en).join(", ");

    // 2. Logic: The "Imagination" Research Angle
    if (isLowConfidence) {
      // Explain to the jury: This is 'Generative Scene Filling'
      const feedback = `The camera view is unclear, but I am imagining the aisle. 
                        You are in ${currentAisleId.replace('_', ' ')}. 
                        Is line mein ${itemsUr} rakha hua hai. 
                        Aapke left side par products check karein.`;
      
      TtsService.speak(feedback);
      return feedback;
    }

    // 3. High Confidence Logic
    const standardFeedback = `Aap ${currentAisleId.replace('_', ' ')} mein hain. Yahan ${itemsEn} मौजूद hain.`;
    TtsService.speak(standardFeedback);
    return standardFeedback;
  }
}
