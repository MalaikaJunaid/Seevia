import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, DeviceEventEmitter, Linking } from 'react-native';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

// Services
import { modelLoaderService } from '@/services/ai/modelLoader.service';
import { anomalyDetectionService } from '@/services/emergency/anomalyDetection.service';
import { fallDetectionService } from '@/services/emergency/fallDetection.service';
import { medicineReminderService } from '@/services/health/medicineReminder.service';
import { hapticService } from '@/services/common/haptic.service';
import { voiceOrchestrator } from '@/services/voice/voiceCommands.orchestrator';
import { groqSTTService } from '@/services/voice/groqWhisperSTT.service';
import { allergenService } from '@/services/pantry/allergen.service';
import { expiryService } from '@/services/pantry/expiry.service';
import { ShoppingListService } from '@/services/pantry/shoppingList.service';
import { AuthService } from '@/services/firebase/auth.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { UserProfileService } from '@/services/firebase/userProfile.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

// Global UI Components
import FloatingMicButton from '@/components/common/FloatingMicButton';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [isGlobalListening, setIsGlobalListening] = useState(false);
  const [userRole, setUserRole] = useState<'pwd' | 'caregiver' | 'volunteer' | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Keep Orchestrator contextually aware
  useEffect(() => {
    if (pathname) voiceOrchestrator.setCurrentPath(pathname);
  }, [pathname]);

  // Initialize all services
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('[Seevia] Initializing services...');
        // AI models
        await modelLoaderService.init().catch(e => console.warn('[Seevia] Model init warn:', e));
        // STT
        await groqSTTService.initialize().catch(e => console.warn('[Seevia] STT init warn:', e));
        // Safety
        anomalyDetectionService.setEnabled(false);
        anomalyDetectionService.startMonitoring().catch(e => console.warn('[Seevia] Anomaly warn:', e));
        // Allergen service — listens to TRIGGER_ALLERGEN_SCAN events
        allergenService.init();
        // Expiry service — listens to TRIGGER_EXPIRY_CHECK events
        expiryService.init();
        // Shopping list service — listens to START_GUIDED_SHOPPING events
        ShoppingListService.init();
        // Medicine reminders
        medicineReminderService.start();
        // Low stock check handler
        DeviceEventEmitter.addListener('TRIGGER_LOW_STOCK_CHECK', async () => {
          try {
            const user = AuthService.getCurrentUser();
            if (!user) { TtsService.speak('Logged in nahi hain.'); return; }
            const items = await PantryService.getPantryItems(user.uid);
            const lowStockItems = items.filter(i => i.quantity <= (i.lowStockThreshold || 1));
            if (lowStockItems.length === 0) {
              TtsService.speak('Aap ki pantry mein tamam cheezein kaafi hain.');
            } else {
              const names = lowStockItems.slice(0, 3).map(i => i.name).join(', ');
              TtsService.speak(`${lowStockItems.length} cheezein khatam ho rahi hain: ${names}. Inhe shopping list mein add kar lein.`);
            }
          } catch { TtsService.speak('Stock check karne mein masla aya.'); }
        });

        // Fetch user role and start fall detection only for PWD
        const user = AuthService.getCurrentUser();
        if (user) {
          try {
            const profile = await UserProfileService.getUserProfile(user.uid);
            const role = (profile?.role || 'pwd') as 'pwd' | 'caregiver' | 'volunteer';
            setUserRole(role);
            
            // Fall detection only for PWD users
            if (role === 'pwd') {
              fallDetectionService.start().then(ok => {
                if (ok) console.log('[Seevia] Fall detection active (3-phase algorithm) - PWD user');
              });
            } else {
              console.log(`[Seevia] Fall detection disabled for ${role} user`);
            }
          } catch (e) {
            console.warn('[Seevia] Could not fetch user role', e);
            // Default to PWD for safety
            setUserRole('pwd');
            fallDetectionService.start().catch(e => console.warn('[Seevia] Fall detection warn:', e));
          }
        }

        await hapticService.success();
        console.log('[Seevia] All services initialized.');
      } catch (error) {
        console.error('[Seevia] Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };
    initApp();
  }, []);

  // Global event: floating mic button tapped from home
  useEffect(() => {
    const micSub = DeviceEventEmitter.addListener('TRIGGER_GLOBAL_MIC', () => {
      toggleGlobalVoice();
    });
    const logoutSub = DeviceEventEmitter.addListener('TRIGGER_LOGOUT', async () => {
      try {
        await AuthService.signOut();
        router.replace('/');
      } catch (e) {
        console.error('[LOGOUT]', e);
      }
    });

    // Global SOS — fires even when emergency tab is not mounted
    const sosSub = DeviceEventEmitter.addListener('VOICE_SOS', async () => {
      TtsService.speak('Emergency! Aapke contacts ko alert bheja ja raha hai.');
      await hapticService.trigger('error');
      router.push('/(tabs)/emergency');
      // Also attempt to call primary contact
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const profile = await UserProfileService.getUserProfile(user.uid);
          if (profile?.emergencyPhone) {
            setTimeout(() => Linking.openURL(`tel:${profile.emergencyPhone}`), 3000);
          }
        }
      } catch { /* silent fail, tab handles the UI */ }
    });

    // Global CALL_CAREGIVER fallback
    const callSub = DeviceEventEmitter.addListener('CALL_CAREGIVER', async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (!user) { TtsService.speak('Login required.'); return; }
        const profile = await UserProfileService.getUserProfile(user.uid);
        if (profile?.emergencyPhone) {
          TtsService.speak(`${profile.emergencyContactName || 'Caregiver'} ko call kar raha hoon.`);
          Linking.openURL(`tel:${profile.emergencyPhone}`);
        } else {
          TtsService.speak('Koi emergency contact profile mein save nahi hai.');
          router.push('/(tabs)/emergency');
        }
      } catch { router.push('/(tabs)/emergency'); }
    });

    // Global CALL_VOLUNTEER handler
    const volunteerSub = DeviceEventEmitter.addListener('CALL_VOLUNTEER', async () => {
      TtsService.speak('Volunteer network se connect kar raha hoon. Ek lamha sabr karein.');
      router.push('/volunteer-home');
    });

    // Global TOGGLE_HAPTICS handler
    const hapticSub = DeviceEventEmitter.addListener('TOGGLE_HAPTICS', () => {
      TtsService.speak('Haptics mode toggled.');
      hapticService.trigger('success');
    });

    // Global FALL_DETECTED handler
    const fallSub = DeviceEventEmitter.addListener('FALL_DETECTED', () => {
      router.push('/(tabs)/emergency');
    });

    // Allow voice "Theek hoon" to cancel fall SOS
    const cancelFallSub = DeviceEventEmitter.addListener('VOICE_CANCEL_FALL', () => {
      fallDetectionService.cancelFallResponse();
    });

    return () => {
      micSub.remove();
      logoutSub.remove();
      sosSub.remove();
      callSub.remove();
      volunteerSub.remove();
      hapticSub.remove();
      fallSub.remove();
      cancelFallSub.remove();
    };
  }, []);

  const toggleGlobalVoice = async () => {
    setIsGlobalListening(true);
    DeviceEventEmitter.emit('MIC_STATE_CHANGED', { listening: true });
    await voiceOrchestrator.triggerManualCommand();
    setIsGlobalListening(false);
    DeviceEventEmitter.emit('MIC_STATE_CHANGED', { listening: false });
  };

  // 🛠️ THE FIX: Strictly use built-in themes. No undefined color overrides!
  const rootTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  if (!isReady) {
    return null; // App is still loading services
  }

  return (
    <ThemeProvider value={rootTheme}>
      {/* Hardcoded background color ensures View never crashes on undefined theme variables */}
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF' }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="voice-command" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="scanner" options={{ animation: 'fade' }} />
          <Stack.Screen name="add-item" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pantry-detail" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="store-navigation" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="emergency" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'fullScreenModal', animation: 'flip' }} />
          <Stack.Screen name="caregiver" options={{ animation: 'fade' }} />
          <Stack.Screen name="volunteer-home" options={{ animation: 'fade' }} />
          <Stack.Screen name="volunteer-mapping" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="volunteer-profile" options={{ animation: 'slide_from_right' }} />
        </Stack>

        {/* Floating mic only for PWD users */}
        {userRole === 'pwd' && (
          <FloatingMicButton 
            isListening={isGlobalListening} 
            onPress={toggleGlobalVoice} 
          />
        )}
        
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </ThemeProvider>
  );
}