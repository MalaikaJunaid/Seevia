import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

// Seevia Branding & Services
import { DARK_THEME, LIGHT_THEME } from '../src/theme/colors';
import { AuthService } from '../src/services/firebase/auth.service';
import { TextToSpeechService } from '../src/services/voice/textToSpeech.service';
import { WakeWordService } from '../src/services/voice/wakeWord.service';
import { hapticService } from '../src/services/common/haptic.service';

export const unstable_settings = {
  // Module 1: Ensure onboarding is the fallback entry point
  initialRouteName: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // 1. Initialize Global Services (Module 2 & 5)
  useEffect(() => {
    const initApp = async () => {
      await TextToSpeechService.init();
      await WakeWordService.init();
      hapticService.trigger('success'); // Tactile confirmation of boot
      setIsReady(true);
    };
    initApp();
  }, []);

  // 2. Auth Guard: Handle navigation between Auth and App flows
  useEffect(() => {
    if (!isReady) return;

    const user = AuthService.getCurrentUser();
    const inAuthGroup = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Direct new/unauthenticated users to setup
      router.replace('/onboarding');
    } else if (user && inAuthGroup) {
      // Direct authenticated users to their synced dashboard
      router.replace('/(tabs)/home');
    }
  }, [isReady, segments]);

  // Seevia High-Contrast Theme Mapping
  const CustomNavigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: DARK_THEME.primary,
      background: colorScheme === 'dark' ? DARK_THEME.background : LIGHT_THEME.background,
      card: colorScheme === 'dark' ? DARK_THEME.card : LIGHT_THEME.card,
      text: colorScheme === 'dark' ? DARK_THEME.text : LIGHT_THEME.text,
      border: colorScheme === 'dark' ? DARK_THEME.cardBorder : LIGHT_THEME.cardBorder,
    },
  };

  if (!isReady) return null;

  return (
    <ThemeProvider value={CustomNavigationTheme}>
      <Stack screenOptions={{ 
        headerShown: false,
        animation: 'fade_from_bottom' 
      }}>
        {/* Module 1: Initialization Gateway */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        
        {/* Main Application Hub (Tabs) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Module 4 & 5: Emergency/Vision Overlays */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'fullScreenModal', 
            animation: 'flip',
            title: 'Seevia Emergency' 
          }} 
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
