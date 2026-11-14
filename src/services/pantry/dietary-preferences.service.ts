/**
 * Dietary Preferences & Health Service
 * The Single Source of Truth for user dietary preferences, allergies, and health restrictions in Seevia.
 */

import { FirestoreService } from '../firebase/firestore.service';
import { logger } from '@/utils/logger';

export interface DietaryProfile {
  userId: string;
  dietaryPreferences: string[]; // vegetarian, vegan, keto, etc.
  allergies: string[]; // peanuts, dairy, gluten, etc.
  medicalRestrictions: string[]; // diabetes, hypertension, etc.
  preferredCuisines: string[]; // Pakistani, Asian, Mediterranean, etc.
  dislikedFoods: string[];
  updatedAt: number;
}

class DietaryPreferencesService {
  private readonly MODULE = 'DIETARY_PREFS';
  private userProfiles: Map<string, DietaryProfile> = new Map();
  private readonly COLLECTION = 'dietary_profiles';

  /**
   * Initialize dietary preferences service for a user
   */
  async initialize(userId: string): Promise<void> {
    try {
      logger.info(this.MODULE, 'Loading dietary profile', { userId });
      await this.loadProfile(userId);
    } catch (error) {
      logger.error(this.MODULE, 'Initialization failed', error);
    }
  }

  /**
   * Load or create dietary profile
   */
  private async loadProfile(userId: string): Promise<DietaryProfile> {
    const defaultProfile: DietaryProfile = {
      userId,
      dietaryPreferences: [],
      allergies: ['peanuts', 'dairy'], // Demo fallback defaults
      medicalRestrictions: [],
      preferredCuisines: [],
      dislikedFoods: [],
      updatedAt: Date.now(),
    };

    try {
      const profile = await FirestoreService.getDocument<DietaryProfile>(
        this.COLLECTION,
        userId
      );

      if (profile) {
        this.userProfiles.set(userId, profile as DietaryProfile);
        logger.info(this.MODULE, 'Loaded existing profile');
        return profile as DietaryProfile;
      } else {
        this.userProfiles.set(userId, defaultProfile);
        await this.saveProfile(userId, defaultProfile);
        logger.info(this.MODULE, 'Created default profile');
        return defaultProfile;
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load profile from Firestore, using offline cache for demo', error);
      // DEMO FAILSAFE: Never crash if the internet drops. Return the safe default.
      this.userProfiles.set(userId, defaultProfile);
      return defaultProfile;
    }
  }

  /**
   * Get user's dietary profile (loads from DB if not in cache)
   */
  async getProfile(userId: string): Promise<DietaryProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }
    return await this.loadProfile(userId);
  }

  /**
   * Alias for getProfile to ensure compatibility with HealthGuard.ts
   */
  async getPreferences(userId: string): Promise<DietaryProfile> {
    return this.getProfile(userId);
  }

  /**
   * Updates specific parts of the user's dietary profile
   */
  async updatePreferences(userId: string, updates: Partial<DietaryProfile>): Promise<void> {
    try {
      const currentProfile = await this.getProfile(userId);
      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: Date.now()
      };
      
      await this.saveProfile(userId, updatedProfile);
      logger.info(this.MODULE, 'Preferences updated successfully');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to update preferences', error);
      throw error;
    }
  }

  /**
   * Fast Offline Check: Check if food item is safe for user.
   * (HealthGuard.ts uses Groq LLM, but this acts as an instant local fallback)
   */
  async isFoodSafe(userId: string, foodName: string, allergens: string[] = []): Promise<{ isSafe: boolean; reason: string }> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return { isSafe: true, reason: "" };

      const normalizedFood = foodName.toLowerCase();
      const normalizedAllergies = allergens.map(a => a.toLowerCase());

      // 1. Check against allergies
      for (const allergy of profile.allergies) {
        if (normalizedFood.includes(allergy.toLowerCase()) || normalizedAllergies.includes(allergy.toLowerCase())) {
          return { isSafe: false, reason: `Is mein ${allergy} shamil ho sakta hai, jis se aap ko allergy hai.` };
        }
      }

      // 2. Check against medical restrictions
      for (const restriction of profile.medicalRestrictions) {
        if (normalizedFood.includes(restriction.toLowerCase()) || normalizedAllergies.includes(restriction.toLowerCase())) {
          return { isSafe: false, reason: `Yeh aapki ${restriction} ki condition ke liye theek nahi.` };
        }
      }

      // 3. Check against disliked foods
      for (const disliked of profile.dislikedFoods) {
        if (normalizedFood.includes(disliked.toLowerCase())) {
          return { isSafe: false, reason: `Yeh item aapki disliked list mein hai.` };
        }
      }

      return { isSafe: true, reason: "Yeh aapke liye safe lag raha hai." };
    } catch (error) {
      logger.error(this.MODULE, 'Safety check failed', error);
      // Failsafe: Default to safe if check fails to prevent app blocking
      return { isSafe: true, reason: "Safety check error, proceed with caution." }; 
    }
  }

  /**
   * Get dietary summary for voice announcements in Roman Urdu
   */
  async getDietarySummaryForVoice(userId: string): Promise<string> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return 'Koi dietary preferences set nahi hain.';

      let summary = '';

      if (profile.allergies.length > 0) {
        summary += `Aap ko ${profile.allergies.join(' aur ')} se allergy hai. `;
      }

      if (profile.medicalRestrictions.length > 0) {
        summary += `Aap ko ${profile.medicalRestrictions.join(' aur ')} ka parhez hai. `;
      }

      if (profile.dietaryPreferences.length > 0) {
        summary += `Aap generally ${profile.dietaryPreferences.join(' aur ')} khana pasand karte hain. `;
      }

      return summary || 'Aap ki health profile mein koi pabandi nahi hai.';
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get summary', error);
      return 'Profile load karne mein masla aaya.';
    }
  }

  /**
   * Private: Save profile to Firestore
   */
  private async saveProfile(userId: string, profile: DietaryProfile): Promise<void> {
    try {
      await FirestoreService.setDocument(
        this.COLLECTION,
        userId,
        profile as any
      );
      // Update local cache
      this.userProfiles.set(userId, profile);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to save profile', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dietaryPreferencesService = new DietaryPreferencesService();