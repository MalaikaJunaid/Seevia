/**
 * useUserProfile Hook
 * Complete profile and settings management for React components
 */

import { useEffect, useState, useCallback } from 'react';
import {
  userProfileService,
  type UserProfile,
  type EmergencyContact,
  type AccessibilityPreferences,
  type HealthProfile,
  type InteractionMode,
  type Language,
} from '@/services/profile/profile.service';
import { useAuth } from './useAuth';
import { useAccessibility } from './useAccessibility';

interface UseUserProfileReturn {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Profile Management
  createProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Emergency Contacts
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeEmergencyContact: (contactId: string) => Promise<void>;
  getEmergencyContactsSummary: () => string;

  // Health Profile
  healthProfile: HealthProfile | null;
  updateHealthProfile: (health: Partial<HealthProfile>) => Promise<void>;
  getHealthSummary: () => string;

  // Accessibility
  updateAccessibility: (prefs: Partial<AccessibilityPreferences>) => Promise<void>;

  // Utilities
  isProfileComplete: () => boolean;
  hasEmergencyContact: () => boolean;
}

export const useUserProfile = (): UseUserProfileReturn => {
  const { user } = useAuth();
  const { announce } = useAccessibility();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize profile on mount
  useEffect(() => {
    if (!user?.uid) return;

    const initProfile = async () => {
      try {
        setIsLoading(true);
        await userProfileService.initialize(user.uid);
        setProfile(userProfileService.getProfile());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setError(message);
        announce(`خرابی: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initProfile();
  }, [user?.uid, announce]);

  const createProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!user?.uid) return;

      try {
        setError(null);
        const newProfile = await userProfileService.createProfile(user.uid, data);
        setProfile(newProfile);
        announce('پروفائل بنایا گیا');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create profile';
        setError(message);
        announce(`خرابی: ${message}`);
      }
    },
    [user?.uid, announce]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user?.uid) return;

      try {
        setError(null);
        const updated = await userProfileService.updateProfile(user.uid, updates);
        setProfile(updated);
        announce('پروفائل اپڈیٹ ہوگیا');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
      }
    },
    [user?.uid, announce]
  );

  const completeOnboarding = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      await userProfileService.completeOnboarding(user.uid);
      const updated = userProfileService.getProfile();
      setProfile(updated);
      announce('آن بورڈنگ مکمل ہو گئی');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding';
      setError(message);
      announce(`خرابی: ${message}`);
    }
  }, [user?.uid, announce]);

  const addEmergencyContact = useCallback(
    async (contact: Omit<EmergencyContact, 'id'>) => {
      if (!user?.uid) return;

      try {
        setError(null);
        const added = await userProfileService.addEmergencyContact(user.uid, contact);
        const updated = userProfileService.getProfile();
        setProfile(updated);
        announce(`${contact.name} شامل ہوگیا`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add contact';
        setError(message);
        announce(`خرابی: ${message}`);
      }
    },
    [user?.uid, announce]
  );

  const removeEmergencyContact = useCallback(
    async (contactId: string) => {
      if (!user?.uid) return;

      try {
        setError(null);
        await userProfileService.removeEmergencyContact(user.uid, contactId);
        const updated = userProfileService.getProfile();
        setProfile(updated);
        announce('کنٹیکٹ ہٹایا گیا');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove contact';
        setError(message);
      }
    },
    [user?.uid, announce]
  );

  const updateHealthProfile = useCallback(
    async (health: Partial<HealthProfile>) => {
      if (!user?.uid) return;

      try {
        setError(null);
        await userProfileService.updateHealthProfile(user.uid, health);
        const updated = userProfileService.getProfile();
        setProfile(updated);
        announce('صحت کی معلومات محفوظ ہو گئیں');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update health info';
        setError(message);
      }
    },
    [user?.uid, announce]
  );

  const updateAccessibility = useCallback(
    async (prefs: Partial<AccessibilityPreferences>) => {
      if (!user?.uid) return;

      try {
        setError(null);
        await userProfileService.updateAccessibilityPreferences(user.uid, prefs);
        const updated = userProfileService.getProfile();
        setProfile(updated);
        announce('رسائی کی ترجیحات محفوظ ہو گئیں');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update accessibility';
        setError(message);
      }
    },
    [user?.uid, announce]
  );

  return {
    profile,
    isLoading,
    error,
    createProfile,
    updateProfile,
    completeOnboarding,
    emergencyContacts: profile?.emergencyContacts || [],
    addEmergencyContact,
    removeEmergencyContact,
    getEmergencyContactsSummary: () =>
      userProfileService.getEmergencyContactsSummaryVoice(),
    healthProfile: profile?.healthProfile || null,
    updateHealthProfile,
    getHealthSummary: () =>
      userProfileService.getHealthProfileSummaryVoice(),
    updateAccessibility,
    isProfileComplete: () => userProfileService.isProfileComplete(),
    hasEmergencyContact: () => userProfileService.hasRequiredEmergencyContact(),
  };
};
