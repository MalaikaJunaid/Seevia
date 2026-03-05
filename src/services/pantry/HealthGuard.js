/**
 * HealthGuard.js: The Safety Filter for Seevia.
 * Cross-references pantry items with the user's Medical Profile.
 */

export default class HealthGuard {
  /**
   * Validates if an item is safe for the user.
   * @param {Object} itemData - Data from the pantry (with allergy_tags).
   * @param {Object} userProfile - Medical data from Module 1.
   */
  static validateSafety(itemData, userProfile) {
    const { product_name, allergy_tags } = itemData;
    const { user_allergies, health_conditions } = userProfile;

    // 1. Check for direct Allergy Hits
    const foundAllergens = allergy_tags.filter(tag => 
      user_allergies.includes(tag.toLowerCase())
    );

    if (foundAllergens.length > 0) {
      return {
        isSafe: false,
        reason: "Allergy Alert",
        message: `Khabardar! ${product_name} mein ${foundAllergens.join(", ")} shamil hai, jo aapki allergy profile mein hai.`
      };
    }

    // 2. Check for Medical Condition Conflicts (e.g., Diabetes vs. High Sugar)
    if (health_conditions.includes("diabetes") && allergy_tags.includes("high_sugar")) {
      return {
        isSafe: false,
        reason: "Medical Conflict",
        message: `${product_name} mein sugar ziada hai, jo aapki health condition ke liye theek nahi.`
      };
    }

    return { isSafe: true, message: `${product_name} is safe for you to consume.` };
  }
}
