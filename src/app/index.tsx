import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Seevia Theme
import { DARK_THEME as theme } from '../src/theme/colors';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkNavigationFlow();
  }, []);

  const checkNavigationFlow = async () => {
    try {
      // Check if user has finished Module 1 setup
      const hasCompletedOnboarding = await AsyncStorage.getItem('seevia_onboarding_complete');

      if (hasCompletedOnboarding === 'true') {
        // Redirect to main Dashboard (tabs)
        router.replace('/(tabs)');
      } else {
        // Redirect to Module 1 Onboarding
        router.replace('/onboarding');
      }
    } catch (e) {
      // Default to onboarding if error occurs
      router.replace('/onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* High-contrast loader for visual accessibility */}
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
