import { useEffect } from 'react';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { allergenService } from '@/services/pantry/allergen.service';
import { expiryService } from '@/services/pantry/expiry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
// 🛠️ Import the Aisle Imagination service to start its background listener
import AisleImaginationService from '@/services/shopping/AisleImagination';

export default function GlobalVoiceHandlers() {
  const router = useRouter();

  useEffect(() => {
    // 🛒 1. Initialize Indoor Navigation (Aisle Imagination)
    // This listens for 'START_INDOOR_NAV' from the Orchestrator
    AisleImaginationService.init();
    allergenService.init();
    // Start listening for expiry checks
    expiryService.init();
    
    // 🗺️ 2. External Navigation (Google Maps)
    const navListener = DeviceEventEmitter.addListener('NAVIGATE_EXTERNAL', (destination: string) => {
      const url = Platform.select({
        ios: `maps:0,0?q=${destination}`,
        android: `geo:0,0?q=${destination}`,
      });
      if (url) Linking.openURL(url);
    });

    // 📞 3. Caregiver Calls
    const caregiverListener = DeviceEventEmitter.addListener('CALL_CAREGIVER', () => {
      // In a real app, fetch from UserProfile. For demo, dial emergency/caregiver default.
      Linking.openURL('tel:1122'); 
    });

    // 🙋 4. Volunteer Network
    const volunteerListener = DeviceEventEmitter.addListener('CALL_VOLUNTEER', () => {
      // Routes to the volunteer-home screen matching your app directory structure
      router.push('/volunteer-home'); 
    });

    // 📳 5. Haptics Toggle
    const hapticsListener = DeviceEventEmitter.addListener('TOGGLE_HAPTICS', async () => {
      await hapticService.success();
      TtsService.speak("Haptics mode on. Main ab vibrations se guide karungi.");
      // You can update a global state/Zustand store for haptics here if needed
    });

    // 🚪 6. Logout
    const logoutListener = DeviceEventEmitter.addListener('TRIGGER_LOGOUT', async () => {
      if (AuthService.signOut) {
        await AuthService.signOut();
      } else {
        // Fallback demo bypass if TypeScript is still being stubborn
        await (AuthService as any).signOut?.();
      }
      // Routes back to the root/login screen
      router.replace('/'); 
    });

    return () => {
      navListener.remove();
      caregiverListener.remove();
      volunteerListener.remove();
      hapticsListener.remove();
      logoutListener.remove();
    };
  }, []);

  return null; // This component has no UI, it just listens!
}