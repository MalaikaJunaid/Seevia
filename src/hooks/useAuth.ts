/**
 * useAuth Hook
 * Provides current user authentication state and auth methods
 * Integrates with Firebase AuthService for real-time auth updates
 */

import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '@/services/firebase/auth.service';
import { UserProfile, UserRole } from '@/services/firebase/userProfile.service';
import { logger } from '@/utils/logger';

interface UseAuthReturn {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => User | null;
  getRouteForRole: () => Promise<string>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial user
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = AuthService.onAuthStateChanged(async (newUser) => {
      setUser(newUser);
      setIsLoading(false);

      if (newUser) {
        logger.info('AUTH_HOOK', `User signed in: ${newUser.uid}`);

        // Fetch user profile and role
        try {
          const profile = await AuthService.getUserProfile(newUser.uid);
          setUserProfile(profile);
          setRole(profile?.role ?? null);
        } catch (err) {
          logger.error('AUTH_HOOK', 'Error fetching user profile', err);
        }
      } else {
        logger.info('AUTH_HOOK', 'User signed out');
        setUserProfile(null);
        setRole(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await AuthService.signOut();
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMsg);
      logger.error('AUTH_HOOK', 'Sign out error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const getRouteForRole = useCallback(async () => {
    if (!user) return '/onboarding';
    return await AuthService.getRouteForRole(user.uid);
  }, [user]);

  return {
    user,
    userProfile,
    role,
    isLoading,
    error,
    signOut,
    refreshUser,
    getRouteForRole,
  };
};
