import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut, // ALIASED to prevent naming collision with your static method
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './config';
import { logger } from '@/utils/logger';
import { UserProfileService, UserProfile, UserRole } from './userProfile.service';
import { DeviceMemoryService } from '@/services/common/deviceMemory.service';

export class AuthService {
  private static readonly MODULE = 'AUTH_SERVICE';

  /**
   * Sign in anonymously (Used for rapid 60% Defense demonstrations)
   */
  static async signInAnonymous(): Promise<User> {
    try {
      const userCredential = await signInAnonymously(auth);
      logger.info(this.MODULE, 'User signed in anonymously');
      return userCredential.user;
    } catch (error: any) { // Added 'any' to fix TS errors
      logger.error(this.MODULE, 'Anonymous sign-in failed', error);
      throw new Error(`Anonymous sign-in failed: ${error.message}`);
    }
  }

  /**
   * Create account for PWD or Caregiver
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      logger.info(this.MODULE, `Account created for: ${email}`);
      return userCredential.user;
    } catch (error: any) {
      logger.error(this.MODULE, 'Sign-up failed', error);
      throw new Error(`Sign-up failed: ${error.message}`);
    }
  }

  /**
   * Sign in to sync data with UAE-based family
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      logger.info(this.MODULE, `User logged in: ${email}`);
      
      // Remember this device for quick re-authentication
      try {
        const token = await userCredential.user.getIdToken();
        await DeviceMemoryService.rememberDevice(email, token);
      } catch (e) {
        logger.warn(this.MODULE, 'Failed to store device memory, continuing anyway', e);
      }
      
      return userCredential.user;
    } catch (error: any) {
      logger.error(this.MODULE, 'Sign-in failed', error);
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }

  /**
   * Standard sign out
   */
  static async signOut(): Promise<void> {
    try {
      // Clear device memory when signing out
      await DeviceMemoryService.forgetDevice();
      await firebaseSignOut(auth); // Use the aliased Firebase function
      logger.info(this.MODULE, 'User signed out');
    } catch (error: any) {
      logger.error(this.MODULE, 'Sign-out failed', error);
      throw new Error(`Sign-out failed: ${error.message}`);
    }
  }

  /**
   * Get currently active user for session checks
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Real-time listener for auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Fetch user profile with role information
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      return await UserProfileService.getUserProfile(uid);
    } catch (error: any) {
      logger.error(this.MODULE, 'Error fetching user profile', error);
      return null;
    }
  }

  /**
   * Create or update user profile with role
   */
  static async createOrUpdateUserProfile(
    uid: string,
    data: Partial<UserProfile>
  ): Promise<void> {
    try {
      await UserProfileService.createOrUpdateUserProfile(uid, data);
    } catch (error: any) {
      logger.error(this.MODULE, 'Error creating/updating user profile', error);
      throw error;
    }
  }

  /**
   * Get user role for routing decisions
   */
  static async getUserRole(uid: string): Promise<UserRole | null> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile?.role ?? null;
    } catch (error: any) {
      logger.error(this.MODULE, 'Error fetching user role', error);
      return null;
    }
  }

  /**
   * Check if user is a PWD
   */
  static async isPWD(uid: string): Promise<boolean> {
    const role = await this.getUserRole(uid);
    return role === 'pwd';
  }

  /**
   * Check if user is a Caregiver
   */
  static async isCaregiver(uid: string): Promise<boolean> {
    const role = await this.getUserRole(uid);
    return role === 'caregiver';
  }

  /**
   * Check if user is a Volunteer
   */
  static async isVolunteer(uid: string): Promise<boolean> {
    const role = await this.getUserRole(uid);
    return role === 'volunteer';
  }

  /**
   * Get appropriate route based on user role
   */
  static async getRouteForRole(uid: string): Promise<string> {
    const role = await this.getUserRole(uid);

    switch (role) {
      case 'pwd':
        return '/(tabs)/home';
      case 'caregiver':
        return '/caregiver/dashboard';
      case 'volunteer':
        return '/volunteer-home';
      default:
        return '/onboarding';
    }
  }

  /**
   * Sign up with role assignment
   */
  static async signUpWithRole(
    email: string,
    password: string,
    role: UserRole,
    displayName?: string,
    additionalData?: Partial<UserProfile>
  ): Promise<User> {
    try {
      // 🛠️ POLISH: Renamed variable to 'user' since signUpWithEmail returns a User object
      const user = await this.signUpWithEmail(email, password, displayName);

      await this.createOrUpdateUserProfile(user.uid, {
        uid: user.uid,
        email: user.email || email,
        fullName: displayName || '',
        role,
        language: 'en',
        allergies: [],
        isSetupComplete: false,
        ...additionalData,
      });

      logger.info(this.MODULE, `User created with role: ${role}`);
      return user;
    } catch (error: any) {
      logger.error(this.MODULE, 'Sign up with role failed', error);
      throw error;
    }
  }

  /**
   * Real-time listener for user profile changes
   */
  static onUserProfileChanged(
    uid: string,
    callback: (profile: UserProfile | null) => void
  ): () => void {
    return UserProfileService.onUserProfileChanged(uid, callback);
  }
}