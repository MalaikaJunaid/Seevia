import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Refactored Services & Constants
import { colors } from '@/src/constants/colors'; 
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { WakeWordService } from '@/src/services/voice/wakeWord.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import { hapticService } from '@/src/services/common/haptic.service';

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step/TOTAL_STEPS)*100}%` }]} />
        </View>
        <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepView}>
            <Ionicons name="eye-outline" size={80} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>I am Seevia</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your eyes beyond the seen. Let's set up your environment.</Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: colors.text }]}>Voice Check</Text>
            <View style={[styles.micCard, { backgroundColor: colors.surface, borderColor: micStatus === 'listening' ? colors.primary : colors.border }]}>
               <Ionicons name="mic" size={40} color={micStatus === 'listening' ? colors.primary : colors.textSecondary} />
               <Text style={{color: colors.text}}>{micStatus === 'listening' ? "Listening for 'Hey Seevia'..." : "Tap to test microphone"}</Text>
            </View>
            <Button title="Start Calibration" onPress={startCalibration} style={styles.wideBtn} />
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepView}>
            <Text style={[styles.title, { color: colors.text }]}>Safety Guard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>List any allergies for the Shopping Assistant.</Text>
            <Input 
              placeholder="e.g. Peanuts, Dairy" 
              value={profile.allergies}
              onChangeText={(t) => setProfile({...profile, allergies: t})}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
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
