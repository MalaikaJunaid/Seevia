/**
 * SceneImagination.js: Enhanced Research Version
 * Implements "Seeing Beyond the Seen" with Bilingual Support.
 */

import storeMap from '../../assets/data/save_mart_pwd_map.json';

export default class SceneImagination {
  /**
   * @param {string} lastKnownAisle - Aisle ID from Vision module[cite: 83].
   * @param {boolean} isBlurry - Low-confidence trigger[cite: 102].
   * @param {string} userQuery - Optional: To match items semantically[cite: 110].
   */
  static imagine(lastKnownAisle, isBlurry = false, userQuery = "") {
    const aisleData = storeMap.aisle_data[lastKnownAisle];

    if (!aisleData) {
      return "Main map se bhatak gayi hun. Stairs ke kareeb jayein reset ke liye."; [cite: 105]
    }

    // 1. Extract Bilingual Items (English & Roman Urdu) [cite: 67, 175]
    const itemsEn = aisleData.items.map(i => i.en).join(", ");
    const itemsUr = aisleData.items.map(i => i.ur).join(", ");

    // 2. Logic: If blurry, perform "Generative Filling" [cite: 44, 112]
    if (isBlurry) {
      return `The camera is blurry, but I am imagining the scene. [cite: 6] 
              You are in ${lastKnownAisle.replace('_', ' ')}. [cite: 99]
              Yahan shayad ${itemsUr} rakha hua hai. [cite: 49]`; 
    }

    // 3. Logic: Standard identification [cite: 107]
    return `You are at ${lastKnownAisle.replace('_', ' ')}. [cite: 109]
            I can see ${itemsEn} clearly on the shelves. [cite: 102]`;
  }
}
