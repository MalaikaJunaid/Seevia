/**
 * profile.service.ts
 * User Profile Management
 * Handles fetching and managing user profile data (allergies, preferences, dietary restrictions)
 */

import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { logger } from '@/utils/logger';

const MODULE = 'PROFILE_SERVICE';
const COLLECTION = 'users';

export interface UserProfileData {
  name: string;
  allergies: string[];
  medications: string;
  preferences: Record<string, any>;
  emergencyContactName: string;
  emergencyPhone: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  name: '',
  allergies: [],
  medications: '',
  preferences: {},
  emergencyContactName: '',
  emergencyPhone: ''
};

/**
 * Get current user's profile from Firestore
 * @returns {Promise<UserProfileData>} User profile object
 */
export async function getUserProfile(): Promise<UserProfileData> {
  try {
    // 1. Dynamically grab the authenticated user
    const user = AuthService.getCurrentUser();
    if (!user) {
      logger.error(MODULE, 'No authenticated user found');
      return DEFAULT_PROFILE;
    }

    // 2. Fetch via the unified Firestore service
    const profile = await FirestoreService.getDocument(COLLECTION, user.uid);
    
    if (profile) {
      return {
        name: profile.name || '',
        allergies: profile.allergies || [],
        medications: profile.medications || '',
        preferences: profile.preferences || {},
        emergencyContactName: profile.emergencyContactName || '',
        emergencyPhone: profile.emergencyPhone || ''
      };
    }

    return DEFAULT_PROFILE;
  } catch (error) {
    logger.error(MODULE, 'Error fetching user profile:', error);
    return DEFAULT_PROFILE;
  }
}

/**
 * Update user's profile
 * @param {Partial<UserProfileData>} profileData - Updated profile fields
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserProfile(profileData: Partial<UserProfileData>): Promise<boolean> {
  try {
    const user = AuthService.getCurrentUser();
    if (!user) {
      logger.error(MODULE, 'No authenticated user found for update');
      return false;
    }
    
    // Use unified service for updates
    await FirestoreService.updateDocument(COLLECTION, user.uid, profileData);
    return true;
  } catch (error) {
    logger.error(MODULE, 'Error updating user profile:', error);
    return false;
  }
}

/**
 * Get user allergies list
 * @returns {Promise<string[]>} Array of allergy strings
 */
export async function getUserAllergies(): Promise<string[]> {
  try {
    const profile = await getUserProfile();
    return profile.allergies || [];
  } catch (error) {
    logger.error(MODULE, 'Error fetching allergies:', error);
    return [];
  }
}

export default {
  getUserProfile,
  updateUserProfile,
  getUserAllergies
};