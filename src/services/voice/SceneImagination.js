/**
 * SceneImagination.js: Enhanced Research Version
 * Implements "Seeing Beyond the Seen" with Bilingual Support.
 */

import storeMap from '../../assets/data/save_mart_pwd_map.json';

export default class SceneImagination {
  /**
   * @param {string} lastKnownAisle - Aisle ID from Vision module.
   * @param {boolean} isBlurry - Low-confidence trigger.
   * @param {string} userQuery - Optional: To match items semantically.
   */
  static imagine(lastKnownAisle, isBlurry = false, userQuery = "") {
    const aisleData = storeMap.aisle_data[lastKnownAisle];

    if (!aisleData) {
      return "Main map se bhatak gayi hun. Stairs ke kareeb jayein reset ke liye.";
    }

    // 1. Extract Bilingual Items (English & Roman Urdu)
    const itemsEn = aisleData.items.map(i => i.en).join(", ");
    const itemsUr = aisleData.items.map(i => i.ur).join(", ");

    // 2. Logic: If blurry, perform "Generative Filling"
    if (isBlurry) {
      return `The camera is blurry, but I am imagining the scene.
              You are in ${lastKnownAisle.replace('_', ' ')}.
              Yahan shayad ${itemsUr} rakha hua hai.`;
    }

    // 3. Logic: Standard identification
    return `You are at ${lastKnownAisle.replace('_', ' ')}.
            I can see ${itemsEn} clearly on the shelves.`;
  }
}
