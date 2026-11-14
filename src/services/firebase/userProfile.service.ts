import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';

export type UserRole = 'pwd' | 'caregiver' | 'volunteer';

export interface UserProfile {
  id?: string; // 🛠️ FIX: Added 'id' to the interface so docSnap.id can map safely
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  language: 'en' | 'ur';
  allergies: string[];
  medications?: string;
  interactionMode?: 'voice' | 'touch';
  emergencyContactName?: string;
  emergencyPhone?: string;
  caregiverId?: string;
  fcmToken?: string;
  isSetupComplete: boolean;
  setupComplete?: boolean;   // alias used by onboarding FirestoreService.setDocument
  createdAt?: any;
  updatedAt?: any;
}

export class UserProfileService {
  private static readonly MODULE = 'USER_PROFILE_SERVICE';

  /**
   * Fetch user profile by Auth UID
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = { id: docSnap.id, ...docSnap.data() } as unknown as UserProfile;
        logger.info(this.MODULE, `Profile fetched for user: ${uid}`);
        return profile;
      }

      logger.warn(this.MODULE, `No profile found for user: ${uid}`);
      return null;
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error fetching user profile', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  /**
   * Create or update user profile
   */
  static async createOrUpdateUserProfile(
    uid: string,
    data: Partial<UserProfile>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      const existingDoc = await getDoc(docRef);

      if (existingDoc.exists()) {
        await updateDoc(docRef, {
          ...data,
          updatedAt: new Date(),
        });
        logger.info(this.MODULE, `Profile updated for user: ${uid}`);
      } else {
        await setDoc(docRef, {
          uid,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        logger.info(this.MODULE, `Profile created for user: ${uid}`);
      }
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error creating/updating user profile', error);
      throw new Error(`Failed to create/update user profile: ${error.message}`);
    }
  }

  /**
   * Real-time listener for user profile changes
   */
  static onUserProfileChanged(
    uid: string,
    callback: (profile: UserProfile | null) => void
  ): () => void {
    const docRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as unknown as UserProfile);
        } else {
          callback(null);
        }
      },
      (error: any) => { // 🛠️ FIX: Explicitly typed 'error' as 'any'
        logger.error(this.MODULE, 'Error listening to profile changes', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Update user's FCM token for push notifications
   */
  static async updateFCMToken(uid: string, token: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, { fcmToken: token });
      logger.info(this.MODULE, `FCM token updated for user: ${uid}`);
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error updating FCM token', error);
      throw new Error(`Failed to update FCM token: ${error.message}`);
    }
  }

  /**
   * Link caregiver to PWD profile
   */
  static async linkCaregiver(
    pwdUid: string,
    caregiverUid: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', pwdUid);
      await updateDoc(docRef, { caregiverId: caregiverUid });
      logger.info(this.MODULE, `Caregiver ${caregiverUid} linked to PWD ${pwdUid}`);
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error linking caregiver', error);
      throw new Error(`Failed to link caregiver: ${error.message}`);
    }
  }

  /**
   * Check if user has completed setup
   */
  static async isSetupComplete(uid: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile?.isSetupComplete ?? false;
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error checking setup status', error);
      return false;
    }
  }

  /**
   * Mark user setup as complete
   */
  static async markSetupComplete(uid: string): Promise<void> {
    try {
      await this.createOrUpdateUserProfile(uid, { isSetupComplete: true });
      logger.info(this.MODULE, `Setup marked complete for user: ${uid}`);
    } catch (error: any) { // 🛠️ FIX: Explicitly typed 'error' as 'any'
      logger.error(this.MODULE, 'Error marking setup complete', error);
      throw new Error(`Failed to mark setup complete: ${error.message}`);
    }
  }
}