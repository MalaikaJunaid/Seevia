/**
 * Seevia PWD Onboarding — Voice-first setup for visually impaired users
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, DeviceEventEmitter, Image, Animated } from 'react-native';
import { hapticService } from '@/services/common/haptic.service';

// Seevia Core Components & Theme
import BrailleDots from '../components/common/BrailleDots';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ScreenLayout from '../components/common/ScreenLayout';
import { AccessibleRadioButton, type RadioButtonOption } from '../components/ui/AccessibleRadioButton';
import { DARK_THEME as theme } from '../theme/colors';
import { SPACING, TYPOGRAPHY } from '../theme';

// Unified Services
import { AuthService } from '../services/firebase/auth.service';
import { FirestoreService } from '../services/firebase/firestore.service';
import { anomalyDetectionService } from '../services/emergency/anomalyDetection.service';
import { TextToSpeechService } from '../services/voice/textToSpeech.service';

// 🛠️ REMOVED dummy WakePhraseListener
// 🛠️ ADDED actual Groq STT Service for live voice processing
import { groqSTTService } from '../services/voice/groqWhisperSTT.service';
import { logger } from '@/utils/logger';

const TOTAL_STEPS = 7;

interface OnboardingProfile {
  name: string;
  language: 'ur' | 'en';
  interactionMode: 'voice' | 'touch';
  medications: string;
  allergies: string;
  emergencyContactName: string;
  emergencyPhone: string;
}

export default function PWDOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'verified'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  
  const announceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [profile, setProfile] = useState<OnboardingProfile>({
    name: '',
    language: 'ur',
    interactionMode: 'voice',
    medications: '',
    allergies: '',
    emergencyContactName: '',
    emergencyPhone: ''
  });

  useEffect(() => {
    announceStep(step);

    // Silence UI nags if manual mic triggered
    const silenceListener = DeviceEventEmitter.addListener('MIC_MANUALLY_TRIGGERED', () => {
      if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    });

    // 🛠️ Fallback: If global Orchestrator handles the mic, unlock the UI
    const calibrationSuccessListener = DeviceEventEmitter.addListener('VOICE_CALIBRATION_SUCCESS', () => {
      setMicStatus('verified');
      setTimeout(() => nextStep(), 1500);
    });

    return () => {
      silenceListener.remove();
      calibrationSuccessListener.remove();
      if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    };
  }, [step]);

  const announceStep = async (currentStep: number) => {
    if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    if (TextToSpeechService.stop) await TextToSpeechService.stop();

    const titles: Record<number, string> = {
      1: "Welcome to Seevia - Your eyes beyond the seen",
      2: "Select your preferred language",
      3: "Calibrate your microphone and voice",
      4: "Choose your interaction mode",
      5: "Enter your health profile",
      6: "Provide emergency contact information",
      7: "Review and confirm your setup"
    };
    
    const description: Record<number, string> = {
      1: "Seevia is an AI assistive technology for visually impaired users. We will guide you through setup in seven steps.",
      2: "You can use Roman Urdu or English for voice commands and interactions.",
      3: "Let us hear your voice. Say 'Hey Seevia' when ready.",
      4: "Choose between voice-first or touch-first interaction.",
      5: "Tell us about your health to provide better assistance.",
      6: "We need emergency contact information to keep you safe.",
      7: "Review all your settings before starting your journey with Seevia."
    };

    await TextToSpeechService.speak(titles[currentStep]);
    if (currentStep === 1) {
      hapticService.trigger('success');
      setTimeout(() => hapticService.trigger('light'), 600);
      setTimeout(() => hapticService.trigger('light'), 1200);
    }
    
    announceTimeoutRef.current = setTimeout(() => {
      TextToSpeechService.speak(description[currentStep]);
    }, 2500); 
  };

  const handleMicTest = async () => {
    // Clean up any pending intro announcements
    if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
    if (TextToSpeechService.stop) await TextToSpeechService.stop();

    setMicStatus('listening');
    await TextToSpeechService.speak("Please say 'Hey Seevia'.");
    
    try {
      // 🛠️ Give TTS 1.5 seconds to finish before we open the mic to avoid echoing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 🛠️ THE REAL DEAL: Activate Groq Whisper to listen for exactly 5 seconds
      logger.info('ONBOARDING', 'Opening mic for live calibration...');
      const sttResult = await groqSTTService.listenForCommand(5000);

      if (sttResult.success && sttResult.text) {
        const transcript = sttResult.text.toLowerCase();
        logger.info('ONBOARDING', `Heard: "${transcript}"`);
        
        // Check if the transcript contains the wake word
        if (transcript.includes('hey') || transcript.includes('seevia') || transcript.includes('cv') || transcript.includes('c v')) {
          setMicStatus('verified');
          await TextToSpeechService.speak("Voice recognized successfully. Great job!");
          
          setTimeout(() => {
            nextStep();
          }, 1500);
        } else {
          // Heard something else
          setMicStatus('idle');
          await TextToSpeechService.speak(`I heard you say "${sttResult.text}", but I need you to say "Hey Seevia". Please try again.`);
        }
      } else {
        // Heard nothing or transcription failed
        setMicStatus('idle');
        await TextToSpeechService.speak("I didn't catch that. Please tap the button and try again.");
      }

    } catch (error) {
      logger.error('ONBOARDING', "Mic calibration error", error);
      setMicStatus('idle');
      await TextToSpeechService.speak("There was an issue with the microphone. Please try again.");
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleFinalize();
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsLoading(true);

      const user = AuthService.getCurrentUser();
      
      if (!user) {
        await TextToSpeechService.speak("Authentication error. Please log in first.");
        Alert.alert('Error', 'No user is currently logged in.');
        setIsLoading(false);
        return;
      }

      await TextToSpeechService.speak("Saving your profile...");

      const userRole = await AuthService.getUserRole(user.uid) || 'pwd';

      await FirestoreService.setDocument('users', user.uid, {
        ...profile,
        allergies: profile.allergies.split(',').map(a => a.trim()).filter(a => a),
        setupComplete: true,
        role: userRole,
        createdAt: Date.now(),
      });

      await TextToSpeechService.speak("Setup complete. Welcome to Seevia. Entering your dashboard.");
      
      if (userRole === 'pwd') {
        anomalyDetectionService.setEnabled(true);
      }
      
      const roleRoute = await AuthService.getRouteForRole(user.uid);
      setTimeout(() => {
        router.replace(roleRoute as any);
      }, 2000);
    } catch (error) {
      console.error('Finalization error:', error);
      await TextToSpeechService.speak("There was an error saving your profile. Please try again.");
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <BrailleDots />
        <Text style={[styles.progressText, { color: theme.text }]} allowFontScaling={true}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <Text style={[styles.progressPercentage, { color: theme.primary }]} allowFontScaling={true}>
          {Math.round((step / TOTAL_STEPS) * 100)}%
        </Text>
      </View>
      <View style={[styles.progressBarTrack, { backgroundColor: theme.cardBorder }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: theme.primary, width: `${(step / TOTAL_STEPS) * 100}%` }
          ]}
        />
      </View>
    </View>
  );

  const languageOptions: RadioButtonOption[] = [
    { id: 'ur', label: 'Roman Urdu', description: 'اردو میں کمانڈز' },
    { id: 'en', label: 'English', description: 'English commands' },
  ];

  const interactionModeOptions: RadioButtonOption[] = [
    { id: 'voice', label: 'Voice-First', description: 'Control with voice commands' },
    { id: 'touch', label: 'Touch-First', description: 'Control with touch gestures' },
  ];

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ProgressBar />
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Welcome */}
          {step === 1 && (
            <View style={styles.centerContent}>
              <Image
                source={require('../assets/images/seevia-braile.png')}
                style={styles.brailleImg}
                resizeMode="contain"
                accessibilityLabel="Seevia Braille Logo"
              />
              <Text style={[styles.welcomeTitle, { color: theme.text }]} allowFontScaling={true}>
                Welcome to Seevia
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]} allowFontScaling={true}>
                Your eyes beyond the seen.
              </Text>
              <Text style={[styles.welcomeDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Seevia is an AI-powered assistive technology designed for visually impaired users. We'll guide you through setup in seven simple steps.
              </Text>
            </View>
          )}

          {/* Step 2: Language Selection */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Select Your Language
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Choose the language for voice commands and interactions.
              </Text>
              <View style={{ marginTop: SPACING.lg }}>
                <AccessibleRadioButton
                  options={languageOptions}
                  selectedId={profile.language}
                  onSelectionChange={(id) =>
                    setProfile({ ...profile, language: id as 'ur' | 'en' })
                  }
                  groupLabel="Select language"
                  direction="column"
                  testID="language-selection"
                />
              </View>
            </View>
          )}

          {/* Step 3: Microphone Calibration (LIVE MIC ENABLED) */}
          {step === 3 && (
            <View style={styles.stepContent}>
              {/* SECRET DEMO BYPASS IS STILL ACTIVE FOR EMERGENCIES */}
              <TouchableOpacity 
                activeOpacity={1} 
                onLongPress={() => {
                  console.log("🤫 DEMO BYPASS ACTIVATED");
                  if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current);
                  setMicStatus('verified');
                  TextToSpeechService.speak("Demo bypass activated. Voice verified.");
                  setTimeout(() => nextStep(), 1500);
                }}
              >
                <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                  Calibrate Your Voice
                </Text>
              </TouchableOpacity>
              
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                We'll test your microphone by listening for the wake word "Hey Seevia".
              </Text>

              <View
                style={[
                  styles.micStatusBox,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor:
                      micStatus === 'verified' ? theme.primary :
                      micStatus === 'listening' ? '#FFA500' :
                      theme.border 
                  }
                ]}
              >
                <View
                  style={[
                    styles.micStatusDot,
                    {
                      backgroundColor:
                        micStatus === 'verified' ? theme.primary :
                        micStatus === 'listening' ? '#FFA500' :
                        theme.textSecondary 
                    }
                  ]}
                />
                <Text style={{ color: theme.textSecondary, flex: 1 }} allowFontScaling={true}>
                  {micStatus === 'verified' && '✓ Voice verified'}
                  {micStatus === 'listening' && 'Listening...'}
                  {micStatus === 'idle' && 'Tap to test microphone'}
                </Text>
              </View>

              <Button
                title={micStatus === 'verified' ? 'Voice Verified ✓' : 'Test Microphone'}
                onPress={handleMicTest}
                variant={micStatus === 'listening' ? 'danger' : 'primary'}
                icon={<Ionicons name="mic" size={32} color="#FFF" />}
                style={styles.micButton}
                disabled={micStatus === 'listening'}
              />
            </View>
          )}

          {/* Step 4: Interaction Mode */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Choose Interaction Mode
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                How would you prefer to interact with Seevia?
              </Text>
              <View style={{ marginTop: SPACING.lg }}>
                <AccessibleRadioButton
                  options={interactionModeOptions}
                  selectedId={profile.interactionMode}
                  onSelectionChange={(id) =>
                    setProfile({ ...profile, interactionMode: id as 'voice' | 'touch' })
                  }
                  groupLabel="Select interaction mode"
                  direction="column"
                  testID="interaction-mode"
                />
              </View>
            </View>
          )}

          {/* Step 5: Health Profile */}
          {step === 5 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Health Profile
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Tell us about your health so we can provide better assistance.
              </Text>

              <Input
                label="Full Name"
                value={profile.name}
                onChangeText={(t) => setProfile({ ...profile, name: t })}
                icon="person-outline"
                placeholder="Your name"
              />

              <Input
                label="Medications"
                value={profile.medications}
                onChangeText={(t) => setProfile({ ...profile, medications: t })}
                icon="medical"
                placeholder="e.g., Aspirin, Insulin"
              />

              <Input
                label="Allergies (comma-separated)"
                value={profile.allergies}
                onChangeText={(t) => setProfile({ ...profile, allergies: t })}
                icon="alert-circle-outline"
                placeholder="e.g., Dairy, Nuts, Peanuts"
              />
            </View>
          )}

          {/* Step 6: Emergency Contact */}
          {step === 6 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Emergency Contact
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                We'll contact this person in case of emergency.
              </Text>

              <Input
                label="Contact Name"
                value={profile.emergencyContactName}
                onChangeText={(t) => setProfile({ ...profile, emergencyContactName: t })}
                icon="person-outline"
                placeholder="Contact name"
              />

              <Input
                label="Phone Number"
                value={profile.emergencyPhone}
                onChangeText={(t) => setProfile({ ...profile, emergencyPhone: t })}
                icon="call-outline"
                placeholder="+92 300 1234567"
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* Step 7: Confirmation */}
          {step === 7 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Setup Complete
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Review your settings before finishing setup.
              </Text>

              <View style={[styles.summaryBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <SummaryItem label="Language" value={profile.language === 'ur' ? 'Roman Urdu' : 'English'} />
                <SummaryItem label="Interaction Mode" value={profile.interactionMode === 'voice' ? 'Voice-First' : 'Touch-First'} />
                <SummaryItem label="Name" value={profile.name || 'Not provided'} />
                <SummaryItem label="Emergency Contact" value={profile.emergencyContactName || 'Not provided'} />
              </View>

              <Text style={[styles.confirmationText, { color: theme.textSecondary }]} allowFontScaling={true}>
                You're all set! Tap "Get Started" to begin your Seevia journey.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {step > 1 && (
            <Button
              title="Back"
              onPress={previousStep}
              variant="outline"
              style={{ flex: 1 }}
              disabled={isLoading}
            />
          )}
          <Button
            title={step === TOTAL_STEPS ? (isLoading ? 'Saving...' : 'Get Started') : 'Next'}
            onPress={nextStep}
            style={{ flex: 2, marginLeft: step > 1 ? SPACING.md : 0 }}
            disabled={isLoading || (step === 3 && micStatus !== 'verified')}
          />
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

interface SummaryItemProps {
  label: string;
  value: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]} allowFontScaling={true}>
      {label}:
    </Text>
    <Text style={[styles.summaryValue, { color: theme.text }]} allowFontScaling={true}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  brailleImg: { width: 180, height: 180, marginBottom: SPACING.lg },
  progressContainer: { padding: SPACING.lg, paddingTop: 60 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressText: { fontWeight: '700', flex: 1, marginLeft: SPACING.md },
  progressPercentage: { fontWeight: '700' },
  progressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  contentContainer: { padding: SPACING.lg, paddingBottom: 200 },
  centerContent: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  stepContent: { marginBottom: SPACING.xl },
  welcomeTitle: { ...TYPOGRAPHY.display, marginTop: 20 }, 
  welcomeSubtitle: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  welcomeDescription: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: 20 },
  stepTitle: { ...TYPOGRAPHY.heading, marginBottom: SPACING.md },
  stepDescription: { ...TYPOGRAPHY.body, marginBottom: SPACING.lg },
  micStatusBox: { width: '100%', padding: 20, borderRadius: 12, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 30 },
  micStatusDot: { width: 12, height: 12, borderRadius: 6 },
  micButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', marginTop: SPACING.lg, alignSelf: 'center' },
  navigationButtons: { flexDirection: 'row', padding: SPACING.lg, gap: 10, marginBottom: 20, backgroundColor: theme.background },
  summaryBox: { borderRadius: 12, borderWidth: 1, padding: SPACING.lg, marginVertical: SPACING.lg },
  summaryItem: { marginBottom: SPACING.md },
  summaryLabel: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  summaryValue: { ...TYPOGRAPHY.body, marginTop: SPACING.xs },
  confirmationText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.lg },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
});