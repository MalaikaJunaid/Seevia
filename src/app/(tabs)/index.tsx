import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Seevia Core Components & Theme
import { BrailleDots } from '../../src/components/common/BrailleDots';
import { FloatingMicButton } from '../../src/components/common/FloatingMicButton';
import { ModuleCard } from '../../src/components/common/ModuleCard';
import { ScreenLayout } from '../../src/components/common/ScreenLayout';
import { VoiceFeedbackBar } from '../../src/components/common/VoiceFeedbackBar';
import { DARK_THEME as theme } from '../../src/theme/colors';
import TtsService from '../../src/services/voice/TtsService';
import WakePhraseListener from '../../src/services/voice/WakePhraseListener';
import { SPACING, TYPOGRAPHY } from '../../src/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Module 1: Personalization
  const userName = 'Sufyan'; // Pull this from Firebase/AsyncStorage later
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  useEffect(() => {
    // Module 2: Auditory Onboarding
    TtsService.speak(`Dashboard loaded. Good ${greeting}, ${userName}. Say Hey Seevia to navigate.`);
  }, []);

  const handleStartListening = () => {
    setIsListening(true);
    // Trigger Module 2 WakePhrase logic
    WakePhraseListener.startListening((command) => {
      setTranscript(command);
      setIsListening(false);
      // Logic for IntentEngine would go here to route the user
    });
  };

  const modules = [
    {
      id: 'pantry',
      title: 'Smart Pantry',
      subtitle: 'Track expiry & predictive alerts',
      icon: <Ionicons name="archive" size={24} color={theme.primary} />,
      route: '/(tabs)/pantry',
      badge: 3, 
    },
    {
      id: 'shopping',
      title: 'Shopping Assistant',
      subtitle: 'YOLO-powered brand recognition',
      icon: <Ionicons name="cart" size={24} color={theme.primary} />,
      route: '/scanner',
    },
    {
      id: 'emergency',
      title: 'Safety Hub',
      subtitle: 'AI Fall detection & SOS alerts',
      icon: <Ionicons name="alert-circle" size={24} color={theme.primary} />,
      route: '/emergency',
    },
    {
      id: 'navigation',
      title: 'Store Guide',
      subtitle: 'RL-based Save Mart PWD navigation',
      icon: <Ionicons name="navigate" size={24} color={theme.primary} />,
      route: '/navigation',
    },
  ];

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header Summary */}
        <View style={styles.header}>
          <BrailleDots />
          <Text style={[styles.greeting, { color: theme.text }]}>
            Good {greeting}, {userName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Seevia is monitoring for your safety.
          </Text>
        </View>

        {/* Voice Command Indicator */}
        <View style={styles.voicePromptContainer}>
          <View style={[styles.voicePromptBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.voiceDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.voicePromptText, { color: theme.primary }]}>
              {isListening ? "Listening..." : 'Say "Hey Seevia"'}
            </Text>
          </View>
        </View>

        {/* Module Grid */}
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
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating AI Trigger */}
        <FloatingMicButton onPress={handleStartListening} isListening={isListening} />

        {/* Real-time Transcription Bar */}
        <VoiceFeedbackBar message={transcript} visible={!!transcript} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  greeting: {
    ...TYPOGRAPHY.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
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
    width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm,
  },
  voicePromptText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  moduleScroll: { flex: 1 },
  moduleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
});
