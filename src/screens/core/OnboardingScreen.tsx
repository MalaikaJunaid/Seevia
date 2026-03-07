import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Theme & Services
import { DARK_THEME as theme } from '../../theme/colors'; 
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import TtsService from '../../services/voice/TtsService';
import WakePhraseListener from '../../services/voice/WakePhraseListener';
import { db } from '../../config/firebaseConfig';
import { doc, setDoc } from "firebase/firestore";

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening'>('idle');
  
  // Module 1: User Profile State
  const [profile, setProfile] = useState({
    name: '',
    language: 'English',
    medications: '',
    allergies: '',
    emergencyContact: ''
  });

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setStep(next);
      announceStep(next);
    } else {
      handleFinalSave();
    }
  };

  // Module 2: Voice Feedback for Accessibility
  const announceStep = (stepNumber: number) => {
    const messages = [
      "", "Welcome to Seevia", "Select your language", "Voice calibration",
      "Emergency contact", "Health profile", "Allergies check", "Ready to go"
    ];
    TtsService.speak(messages[stepNumber]);
  };

  // Module 2: Hardware Interaction (Calibration)
  const startCalibration = () => {
    setMicStatus('listening');
    TtsService.speak("Please say: Hey Seevia.");
    
    WakePhraseListener.startListening(() => {
      setMicStatus('idle');
      TtsService.speak("Voice recognized. Great job!");
      nextStep();
    });
  };

  // Module 1 & 3: Firebase Persistence
  const handleFinalSave = async () => {
    try {
      // Logic: Save profile to Firebase to be used by HealthGuard later
      await setDoc(doc(db, "users", "current_user"), {
        ...profile,
        allergies: profile.allergies.split(',').map(s => s.trim()),
        setupComplete: true
      });
      TtsService.speak("Profile saved. Opening your dashboard.");
      router.replace('/(tabs)/home');
    } catch (e) {
      TtsService.speak("Storage error. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={[styles.progressTrack, { backgroundColor: theme.cardBorder }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${(step/TOTAL_STEPS)*100}%` }]} />
        </View>
        <Text style={[styles.stepIndicator, { color: theme.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepView}>
            <Ionicons name="eye-outline" size={80} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>I am Seevia</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your eyes beyond the seen. Let's set up your environment.</Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: theme.text }]}>Voice Check</Text>
            <View style={[styles.micCard, { backgroundColor: theme.card, borderColor: micStatus === 'listening' ? theme.primary : theme.cardBorder }]}>
               <Ionicons name="mic" size={40} color={micStatus === 'listening' ? theme.primary : theme.textSecondary} />
               <Text style={{color: theme.text}}>{micStatus === 'listening' ? "Listening for 'Hey Seevia'..." : "Tap to test microphone"}</Text>
            </View>
            <Button title="Start Calibration" onPress={startCalibration} style={styles.wideBtn} />
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: theme.text }]}>Safety Guard</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>List any allergies (comma separated) for the Shopping Assistant.</Text>
            <Input 
              placeholder="e.g. Peanuts, Dairy, Gluten" 
              value={profile.allergies}
              onChangeText={(t) => setProfile({...profile, allergies: t})}
            />
          </View>
        )}

        {/* ... Rest of steps 2, 4, 5, 7 following same pattern ... */}
      </ScrollView>

      {/* Navigation Footer */}
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
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  stepIndicator: { fontSize: 12, marginTop: 8, fontWeight: 'bold', textAlign: 'right' },
  scrollContent: { padding: 25, alignItems: 'center' },
  stepView: { width: '100%', alignItems: 'center', marginTop: 20 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  micCard: { width: '100%', padding: 30, borderRadius: 20, borderWidth: 2, alignItems: 'center', gap: 15, marginBottom: 20 },
  footer: { flexDirection: 'row', padding: 20, paddingBottom: 40, gap: 15, borderTopWidth: 1 },
  wideBtn: { width: '100%' }
});
