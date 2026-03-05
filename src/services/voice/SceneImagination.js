/**
 * SceneImagination.js: Implements Generative Visual Completion logic.
 * Bridges the gap between Voice (M2) and Vision (M4).
 */

import storeMap from '../../assets/data/save_mart_pwd_map.json';

export default class SceneImagination {
  /**
   * Generates a descriptive 'filling' when camera data is poor.
   * @param {string} lastKnownAisle - The last valid coordinate from the Vision module.
   * @param {boolean} isBlurry - Flag indicating low-confidence vision input.
   */
  static imagine(lastKnownAisle, isBlurry = false) {
    const aisleData = storeMap.aisle_data[lastKnownAisle];

    if (!aisleData) {
      return "I'm lost in the map. Please stay near the entrance stairs for a reset."; [cite: 105]
    }

    // Extract items for generative filling
    const items = aisleData.items.map(i => i.en).join(", "); [cite: 83]

    if (isBlurry) {
      // Research Angle: Seeing Beyond the Seen (Generative Logic)
      return `The view is blurry, but I can imagine this spot. You are in ${lastKnownAisle.replace('_', ' ')}. This area usually contains ${items}.`; [cite: 6, 112]
    }

    return `You are at ${lastKnownAisle.replace('_', ' ')}. I can see ${items} clearly.`; [cite: 102]
  }
}
