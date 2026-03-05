/**
 * ProductMatcher.js: The Semantic Link.
 * Matches Voice/Text queries to the Save Mart PWD Inventory.
 */

import storeMap from '../../assets/data/save_mart_pwd_map.json';

export default class ProductMatcher {
  /**
   * Searches the store map for a specific product.
   * @param {string} query - User input (e.g., "Milk", "Chai", "Lays").
   */
  static findProductInStore(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const aisles = storeMap.aisle_data;

    // 1. Iterate through all aisles in the Save Mart PWD Map
    for (const [aisleId, data] of Object.entries(aisles)) {
      
      // 2. Check both English and Roman Urdu names for a match
      const matchedItem = data.items.find(item => 
        item.en.toLowerCase().includes(normalizedQuery) || 
        item.ur.toLowerCase().includes(normalizedQuery)
      );

      if (matchedItem) {
        console.log(`Match Found: ${matchedItem.en} in ${aisleId}`);
        return {
          itemName: matchedItem.en,
          itemUrdu: matchedItem.ur,
          aisle: aisleId,
          coordinates: data.coordinates, // Used by NavigationEngine
          shelf: "Middle Shelf" // Logic can be extended for shelf height
        };
      }
    }

    // 3. Fail-safe if item isn't in this specific Save Mart branch
    return null;
  }
}
