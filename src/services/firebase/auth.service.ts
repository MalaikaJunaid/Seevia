import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { auth } from './config';
import { logger } from '@/src/utils/logger';

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
    } catch (error) {
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
    } catch (error) {
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
      return userCredential.user;
    } catch (error) {
      logger.error(this.MODULE, 'Sign-in failed', error);
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }

  /**
   * Standard sign out
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
      logger.info(this.MODULE, 'User signed out');
    } catch (error) {
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
}
