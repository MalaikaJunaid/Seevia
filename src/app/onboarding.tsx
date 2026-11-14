/**
 * Seevia Onboarding — Routes to role-specific onboarding flow
 * PWD     → onboarding-pwd.tsx    (voice-first, mic calibration)
 * Volunteer → onboarding-volunteer.tsx (touch-first, CNIC scan, availability)
 * Caregiver → onboarding-caregiver.tsx (touch-first, PWD linking, alerts)
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { DARK_THEME as theme } from '../theme/colors';
import { AuthService } from '../services/firebase/auth.service';
// @ts-ignore
import TtsService from '../services/voice/TtsService';

import PWDOnboardingScreen      from './onboarding-pwd';
import VolunteerOnboardingScreen from './onboarding-volunteer';
import CaregiverOnboardingScreen from './onboarding-caregiver';

type Role = 'pwd' | 'caregiver' | 'volunteer' | null;

export default function OnboardingRouter() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (!user) { router.replace('/'); return; }
        const r = await AuthService.getUserRole(user.uid);
        setRole((r as Role) ?? 'pwd');
      } catch {
        TtsService.speak('Error loading onboarding. Please try again.');
        router.replace('/');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (role === 'volunteer') return <VolunteerOnboardingScreen />;
  if (role === 'caregiver') return <CaregiverOnboardingScreen />;
  return <PWDOnboardingScreen />;
}