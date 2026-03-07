import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Seevia Core Components & Theme
import { BrailleDots } from '../src/components/common/BrailleDots';
import { Button } from '../src/components/common/Button';
import { Input } from '../src/components/common/Input';
import { ScreenLayout } from '../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../src/theme/colors';
import TtsService from '../src/services/voice/TtsService';
import WakePhraseListener from '../src/services/voice/WakePhraseListener';
import { db } from '../src/config/firebaseConfig';
import { doc, setDoc } from "firebase/firestore";
import { SPACING, TYPOGRAPHY } from '../src/theme';

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening'>('idle');

  // Module 1 & 3 Data State
  const [profile, setProfile] = useState({
    name: '',
    language: 'English',
    medications: '',
    allergies: '',
    emergencyContactName: '',
    emergencyPhone: ''
  });

  useEffect(() => {
    announceStep(step);
  }, [step]);

  const announceStep = (currentStep: number) => {
    const titles = [
      "", "Welcome to Seevia", "Select your language", "Voice calibration",
      "Interaction mode", "Your profile", "Emergency contact", "Setup complete"
    ];
    TtsService.speak(titles[currentStep]);
  };

  const handleMicTest = () => {
    setMicStatus('listening');
    TtsService.speak("Please say Hey Seevia.");
    
    // Module 2: Logic Integration
    WakePhraseListener.startListening(() => {
      setMicStatus('idle');
      TtsService.speak("Voice recognized successfully.");
      nextStep();
    });
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleFinalize();
  };

  const handleFinalize = async () => {
    try {
      // Module 1: Save Profile to Firebase
      await setDoc(doc(db, "users", "current_user_id"), {
        ...profile,
        allergies: profile.allergies.split(',').map(a => a.trim()),
        setupComplete: true
      });
      TtsService.speak("Profile saved. Entering your dashboard.");
      router.replace('/(tabs)');
    } catch (e) {
      TtsService.speak("Database error. Please try again.");
    }
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <BrailleDots />
        <Text style={[styles.progressText, { color: theme.text }]}>{Math.round((step/TOTAL_STEPS)*100)}%</Text>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.cardBorder }]}>
        <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${(step/TOTAL_STEPS)*100}%` }]} />
      </View>
    </View>
  );

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ProgressBar />
        <ScrollView contentContainerStyle={styles.contentContainer}>
          
          {step === 1 && (
            <View style={styles.centerContent}>
              <Ionicons name="eye" size={80} color={theme.primary} />
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome to Seevia</Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>Your eyes beyond the seen.</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.centerContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Calibrate Voice</Text>
              <View style={[styles.micStatusBox, { backgroundColor: theme.card, borderColor: micStatus === 'listening' ? theme.primary : theme.cardBorder }]}>
                <View style={[styles.micStatusDot, { backgroundColor: micStatus === 'listening' ? theme.primary : theme.textTertiary }]} />
                <Text style={{ color: theme.textSecondary }}>{micStatus === 'listening' ? "Listening..." : "Tap to test microphone"}</Text>
              </View>
              <Button 
                title="" 
                onPress={handleMicTest} 
                variant={micStatus === 'listening' ? 'danger' : 'primary'}
                icon={<Ionicons name="mic" size={32} color="#FFF" />}
                style={styles.micButton}
              />
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Health Profile</Text>
              <Input label="Full Name" value={profile.name} onChangeText={(t) => setProfile({...profile, name: t})} icon="person-outline" />
              <Input label="Allergies (e.g. Dairy, Nuts)" value={profile.allergies} onChangeText={(t) => setProfile({...profile, allergies: t})} icon="alert-circle-outline" />
            </View>
          )}

          {/* Additional steps would render similar Inputs for Meds and Emergency Contacts */}

        </ScrollView>

        <View style={styles.navigationButtons}>
          {step > 1 && <Button title="Back" onPress={() => setStep(step - 1)} variant="outline" style={{ flex: 1 }} />}
          <Button title={step === TOTAL_STEPS ? 'Get Started' : 'Next'} onPress={nextStep} style={{ flex: 2 }} />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressContainer: { padding: SPACING.lg, paddingTop: 60 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressText: { fontWeight: '700' },
  progressBarTrack: { height: 6, borderRadius: 3 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  contentContainer: { padding: SPACING.lg },
  centerContent: { alignItems: 'center', marginTop: 40 },
  welcomeTitle: { ...TYPOGRAPHY.title, marginTop: 20 },
  welcomeSubtitle: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: 10 },
  stepTitle: { ...TYPOGRAPHY.heading, marginBottom: 20 },
  micStatusBox: { width: '100%', padding: 20, borderRadius: 12, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 30 },
  micStatusDot: { width: 10, height: 10, borderRadius: 5 },
  micButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center' },
  navigationButtons: { flexDirection: 'row', padding: SPACING.lg, gap: 10, marginBottom: 20 }
});
