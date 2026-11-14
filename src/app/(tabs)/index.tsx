import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, DeviceEventEmitter } from 'react-native';

import BrailleDots from '../../components/common/BrailleDots';
import ModuleCard from '../../components/common/ModuleCard';
import ScreenLayout from '../../components/common/ScreenLayout';
import VoiceFeedbackBar from '../../components/common/VoiceFeedbackBar';

import { DARK_THEME as theme } from '../../theme/colors';
// @ts-ignore
import TtsService from '../../services/voice/TtsService';
import { SPACING, TYPOGRAPHY } from '../../theme';
import { AuthService } from '../../services/firebase/auth.service';
import { PantryService } from '../../services/pantry/pantry.service';

export default function DashboardScreen() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userName, setUserName] = useState('Dost');
  const [pantryBadge, setPantryBadge] = useState(0);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  useEffect(() => {
    // Load user name dynamically
    const loadUser = async () => {
      let firstName = 'Dost'; // Fallback
      
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const profile = await AuthService.getUserProfile(user.uid).catch(() => null);
          
          // 🛠️ FIX: Check profile.name first, then fallback, and extract only the first name
          const rawName = (profile as any)?.name || profile?.fullName || user.displayName || 'Dost';          firstName = rawName !== 'Dost' ? rawName.split(' ')[0] : 'Dost';
          
          setUserName(firstName);

          // Load pantry badge count
          const items = await PantryService.getPantryItems(user.uid).catch(() => []);
          const alerts = items.filter((i: any) => i.quantity <= (i.lowStockThreshold || 1) || !i.expiryDate).length;
          setPantryBadge(alerts);
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
      } finally {
        // 🛠️ FIX: Moved TTS inside the function so it waits for the name to be fetched!
        TtsService.speak(`Good ${greeting}, ${firstName}. Dashboard is ready.`);
      }
    };
    
    loadUser();

    const micSub = DeviceEventEmitter.addListener('MIC_STATE_CHANGED', ({ listening }) => setIsListening(listening));
    return () => micSub.remove();
  }, []);

  const modules = [
    {
      id: 'pantry',
      title: 'Smart Pantry',
      subtitle: 'Track expiry & predictive alerts',
      icon: <Ionicons name="archive" size={24} color={theme.primary} />,
      route: '/(tabs)/pantry',
      badge: pantryBadge || undefined,
    },
    {
      id: 'scanner',
      title: 'Eye Lens',
      subtitle: 'Gemini-powered camera vision',
      icon: <Ionicons name="camera" size={24} color={theme.primary} />,
      route: '/scanner',
    },
    {
      id: 'emergency',
      title: 'Safety Hub',
      subtitle: 'AI Fall detection & SOS',
      icon: <Ionicons name="alert-circle" size={24} color={theme.primary} />,
      route: '/(tabs)/emergency',
    },
    {
      id: 'shopping',
      title: 'Shopping & Navigation',
      subtitle: 'Lists, Maps & store guidance',
      icon: <Ionicons name="navigate" size={24} color={theme.primary} />,
      route: '/(tabs)/shopping',
    },
  ];

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <BrailleDots size={35} />
          <Text style={[styles.greeting, { color: theme.text }]}>
            Good {greeting}, {userName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Seevia is monitoring for your safety.
          </Text>
        </View>

        {/* Hey Seevia Prompt */}
        <View style={styles.voicePromptContainer}>
          <View style={[styles.voicePromptBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.voiceDot, { backgroundColor: isListening ? theme.danger : theme.primary }]} />
            <Text style={[styles.voicePromptText, { color: theme.primary }]}>
              {isListening ? "Listening..." : 'Say "Hey Seevia"'}
            </Text>
          </View>
        </View>

        {/* Main Navigation Modules */}
        <ScrollView
          style={styles.moduleScroll}
          contentContainerStyle={styles.moduleContainer}
          showsVerticalScrollIndicator={false}
        >
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              title={module.title}
              subtitle={module.subtitle}
              icon={module.icon}
              onPress={() => router.push(module.route as any)}
              badge={module.badge}
            />
          ))}
          {/* Bottom spacing to ensure clear scroll over the Floating Button */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Real-time Voice Interaction Feedback */}
        <VoiceFeedbackBar message={transcript} visible={!!transcript} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl + 10,
  },
  greeting: {
    ...TYPOGRAPHY.heading,
    fontSize: 28,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
  },
  voicePromptContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  voicePromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  voiceDot: {
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: SPACING.sm,
  },
  voicePromptText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  moduleScroll: { 
    flex: 1 
  },
  moduleContainer: {
  paddingHorizontal: SPACING.lg,
  paddingBottom: SPACING['2xl'], 
},
});