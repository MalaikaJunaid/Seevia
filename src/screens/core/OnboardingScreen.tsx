import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Refactored Services & Constants
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme'; 
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import BrailleDots from '@/components/common/BrailleDots';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { WakeWordService } from '@/services/voice/wakeWord.service';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { hapticService } from '@/services/common/haptic.service';

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening'>('idle');
  
  const [profile, setProfile] = useState({
    name: '',
    language: 'English',
    medications: '',
    allergies: '',
    emergencyContact: ''
  });

  useEffect(() => {
    announceStep(1);
  }, []);

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setStep(next);
      announceStep(next);
    } else {
      handleFinalSave();
    }
  };

  const announceStep = (stepNumber: number) => {
    const messages = [
      "", "Welcome to Seevia", "Select your language", "Voice calibration",
      "Emergency contact", "Health profile", "Allergies check", "Ready to go"
    ];
    TextToSpeechService.speak(messages[stepNumber]);
  };

  const startCalibration = async () => {
    setMicStatus('listening');
    await TextToSpeechService.speak("Please say: Hey Seevia.");
    
    // Using refactored wakeWord service
    WakeWordService.startListening(() => {
      setMicStatus('idle');
      hapticService.trigger('success');
      TextToSpeechService.speak("Voice recognized. Great job!");
      nextStep();
    });
  };

  const handleFinalSave = async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    try {
      // Logic: Persist profile using unified Firestore service
      await FirestoreService.setDocument('users', user.uid, {
        ...profile,
        allergies: profile.allergies.split(',').map(s => s.trim()),
        setupComplete: true
      });
      
      hapticService.trigger('success');
      await TextToSpeechService.speak("Profile saved. Opening your dashboard.");
      router.replace('/(tabs)/home');
    } catch (e) {
      TextToSpeechService.speak("Storage error. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Braille Header */}
      <View style={styles.headerBar}>
        <BrailleDots />
      </View>

      {/* Progress Header */}
      <View style={styles.header}>
        <View style={[styles.progressTrack, { backgroundColor: theme.cardBorder }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${(step/TOTAL_STEPS)*100}%` }]} />
        </View>
        <Text style={[styles.stepIndicator, { color: theme.textTertiary }]}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepView}>
            <Ionicons name="eye-outline" size={80} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>Welcome to Seevia</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Let's set up your personalized AI assistant</Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: theme.text }]}>Voice Check</Text>
            <View style={[styles.micCard, { backgroundColor: theme.card, borderColor: micStatus === 'listening' ? theme.primary : theme.cardBorder }]}>
               <Ionicons name="mic" size={40} color={micStatus === 'listening' ? theme.primary : theme.textSecondary} />
               <Text style={[styles.micText, { color: theme.text }]}>{micStatus === 'listening' ? "Listening for 'Hey Seevia'..." : "Tap to test microphone"}</Text>
            </View>
            <Button title="Start Calibration" onPress={startCalibration} style={styles.wideBtn} />
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: theme.text }]}>Safety Guard</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>List any allergies for the Shopping Assistant.</Text>
            <Input 
              placeholder="e.g. Peanuts, Dairy" 
              value={profile.allergies}
              onChangeText={(t) => setProfile({...profile, allergies: t})}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.cardBorder }]}>
        {step > 1 && (
          <Button title="Back" variant="outline" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        )}
        <Button 
          title={step === TOTAL_STEPS ? "Finish" : "Next"} 
          onPress={nextStep} 
          style={{ flex: 2 }} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm 
  },
  header: { 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg 
  },
  progressTrack: { 
    height: 4, 
    borderRadius: 2, 
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: { height: '100%' },
  stepIndicator: { 
    fontSize: 12, 
    fontWeight: '600', 
    textAlign: 'right' 
  },
  scrollContent: { 
    padding: SPACING.xl, 
    alignItems: 'center' 
  },
  stepView: { 
    width: '100%', 
    alignItems: 'center', 
    marginTop: SPACING.lg 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    marginBottom: SPACING.md, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 16, 
    textAlign: 'center', 
    lineHeight: 24, 
    marginBottom: SPACING.xl 
  },
  micCard: { 
    width: '100%', 
    padding: SPACING.xl, 
    borderRadius: RADIUS.xl, 
    borderWidth: 2, 
    alignItems: 'center', 
    gap: SPACING.lg, 
    marginBottom: SPACING.lg 
  },
  micText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: { 
    flexDirection: 'row', 
    padding: SPACING.lg, 
    paddingBottom: SPACING.xl, 
    gap: SPACING.md, 
    borderTopWidth: 1 
  },
  wideBtn: { width: '100%' }
});
