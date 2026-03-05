import storeMap from '../../assets/data/save_mart_pwd_map.json';

export default class NavigationEngine {
  /**
   * Finds the aisle for a specific product.
   * @param {string} productName - e.g., "Milk" or "Tea"
   */
  static findProduct(productName) {
    const aisles = storeMap.aisle_data;
    
    for (const [aisleId, data] of Object.entries(aisles)) {
      const found = data.items.find(item => 
        item.en.toLowerCase().includes(productName.toLowerCase()) || 
        item.ur.includes(productName)
      );
      
      if (found) {
        return { aisleId, location: data.coordinates, items: data.items };
      }
    }
    return null;
  }
}
