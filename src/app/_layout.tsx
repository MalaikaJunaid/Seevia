import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { colors } from '@/src/constants/colors';

// Services
import { AuthService } from '@/src/services/firebase/auth.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { WakeWordService } from '@/src/services/voice/wakeWord.service';
import { hapticService } from '@/src/services/common/haptic.service';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. Initialize Core Systems for Module 2 & 5
    const initApp = async () => {
      await TextToSpeechService.init();
      await WakeWordService.init();
      hapticService.trigger('success');
      setIsReady(true);
    };

    initApp();

    // 2. Setup Auth Guard
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      const inTabsGroup = segments[0] === '(tabs)';

      if (!user && inTabsGroup) {
        // Redirect to Login if not authenticated
        router.replace('/auth/LoginScreen');
      } else if (user && !inTabsGroup) {
        // Redirect to Home if authenticated and trying to access auth screens
        router.replace('/(tabs)/home');
      }
    });

    return unsubscribe;
  }, [segments]);

  if (!isReady) return null; // Or a simple loading view

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Auth Group */}
      <Stack.Screen name="auth" options={{ animation: 'fade' }} />

      {/* Main Tabs Group */}
      <Stack.Screen name="(tabs)" options={{ animation: 'slide_from_right' }} />

      {/* Emergency Overlays (High Priority) */}
      <Stack.Screen 
        name="emergency" 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'flip' 
        }} 
      />
    </Stack>
  );
}
