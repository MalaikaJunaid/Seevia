/**
 * Seevia Onboarding Router
 * Routes to correct onboarding based on role: PWD / caregiver / volunteer
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { DARK_THEME as theme } from '../theme/colors';
import { AuthService } from '../services/firebase/auth.service';

import PWDOnboardingScreen from './onboarding-pwd';
import VolunteerOnboardingScreen from './onboarding-volunteer';
import CaregiverOnboardingScreen from './onboarding-caregiver';

export default function OnboardingRouter() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'pwd' | 'caregiver' | 'volunteer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const role = await AuthService.getUserRole(user.uid);
          setUserRole(role as any);
        }
      } catch {
        router.replace('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (userRole === 'caregiver') return <CaregiverOnboardingScreen />;
  if (userRole === 'volunteer') return <VolunteerOnboardingScreen />;
  return <PWDOnboardingScreen />;
}
