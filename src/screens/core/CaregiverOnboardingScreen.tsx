/**
 * Caregiver Onboarding Screen
 * Simplified onboarding flow for caregivers
 * Steps: Welcome > Language > Interaction Mode > Profile > Invite Code > Confirmation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Components & Theme
import BrailleDots from '../../components/common/BrailleDots';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ScreenLayout from '../../components/common/ScreenLayout';
import { AccessibleRadioButton, type RadioButtonOption } from '../../components/ui/AccessibleRadioButton';
import { DARK_THEME as theme } from '../../theme/colors';
import { SPACING, TYPOGRAPHY } from '../../theme';

// Unified Services
import { AuthService } from '../../services/firebase/auth.service';
import { FirestoreService } from '../../services/firebase/firestore.service';
import { PWDConnectionService } from '../../services/firebase/pwdConnection.service';

// @ts-ignore - JS module without types
import TtsService from '../../services/voice/TtsService';

const TOTAL_STEPS = 6;

interface CaregiverOnboardingProfile {
  name: string;
  language: 'ur' | 'en';
  interactionMode: 'voice' | 'touch';
  linkedPWDCode: string;
}

export default function CaregiverOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState<CaregiverOnboardingProfile>({
    name: '',
    language: 'ur',
    interactionMode: 'voice',
    linkedPWDCode: ''
  });

  useEffect(() => {
    announceStep(step);
  }, [step]);

  const announceStep = (currentStep: number) => {
    const titles: Record<number, string> = {
      1: "Welcome to Seevia Caregiver Portal",
      2: "Select your preferred language",
      3: "Choose your interaction mode",
      4: "Tell us about yourself",
      5: "Connect to a PWD user",
      6: "Review and confirm setup"
    };
    
    const description: Record<number, string> = {
      1: "Seevia Caregiver Portal helps you monitor and support visually impaired users. We will guide you through setup in six steps.",
      2: "You can use Roman Urdu or English for voice commands and interactions.",
      3: "Choose between voice-first or touch-first interaction.",
      4: "Tell us your name so PWD users can identify you.",
      5: "Enter the invitation code from the PWD user's Seevia app to create a connection.",
      6: "Review your settings before starting."
    };

    TtsService.speak(titles[currentStep]);
    setTimeout(() => {
      TtsService.speak(description[currentStep]);
    }, 2000);
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
    if (!profile.name.trim()) {
      TtsService.speak("Please enter your name.");
      Alert.alert('Error', 'Name is required.');
      return;
    }

    if (!profile.linkedPWDCode.trim()) {
      TtsService.speak("Please enter a PWD invitation code.");
      Alert.alert('Error', 'PWD invitation code is required.');
      return;
    }

    try {
      setIsLoading(true);
      const user = AuthService.getCurrentUser();
      
      if (!user) {
        TtsService.speak("Authentication error. Please log in first.");
        Alert.alert('Error', 'No user is currently logged in.');
        setIsLoading(false);
        return;
      }

      TtsService.speak("Verifying PWD invitation code...");

      // Validate and link the PWD invitation code
      let connection;
      try {
        connection = await PWDConnectionService.validateAndUseCode(
          profile.linkedPWDCode.toUpperCase(),
          user.uid,
          profile.name
        );
      } catch (validationError: any) {
        TtsService.speak(validationError.message);
        Alert.alert('Invalid Code', validationError.message);
        setIsLoading(false);
        return;
      }

      TtsService.speak("Saving your caregiver profile...");

      // Save caregiver profile to Firestore
      await FirestoreService.setDocument('users', user.uid, {
        name: profile.name,
        language: profile.language,
        interactionMode: profile.interactionMode,
        setupComplete: true,
        role: 'caregiver',
        connectedPWD: connection.pwd_uid,
        connectedPWDName: connection.pwd_name,
        createdAt: Date.now(),
      });

      TtsService.speak("Setup complete. Your caregiver account is ready. Entering your dashboard.");
      
      setTimeout(() => {
        router.replace('/caregiver/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Finalization error:', error);
      TtsService.speak("There was an error saving your profile. Please try again.");
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
        >
          {step === 1 && (
            <View style={styles.centerContent}>
              <Ionicons name="heart" size={80} color={theme.primary} />
              <Text style={[styles.welcomeTitle, { color: theme.text }]} allowFontScaling={true}>
                Welcome to Seevia
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]} allowFontScaling={true}>
                Caregiver Portal
              </Text>
              <Text style={[styles.welcomeDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Monitor and support your loved ones with Seevia's caregiver tools. We'll guide you through setup in six simple steps.
              </Text>
            </View>
          )}

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
                  testID="caregiver-language-selection"
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Choose Interaction Mode
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                How would you prefer to interact with the caregiver portal?
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
                  testID="caregiver-interaction-mode"
                />
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Your Profile
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Tell us your name so PWD users can identify you in their trust circle.
              </Text>

              <Input
                label="Full Name"
                value={profile.name}
                onChangeText={(t) => setProfile({ ...profile, name: t })}
                icon="person-outline"
                placeholder="Your name"
              />
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Connect to PWD User
              </Text>
              <Text style={[styles.stepDescription, { color: theme.textSecondary }]} allowFontScaling={true}>
                Enter the 6-digit invitation code from the PWD user's Seevia app.
              </Text>

              <Input
                label="PWD Invitation Code"
                value={profile.linkedPWDCode}
                onChangeText={(t) => setProfile({ ...profile, linkedPWDCode: t.toUpperCase() })}
                icon="key-outline"
                placeholder="e.g., ABC123"
                maxLength={6}
              />

              <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Ionicons name="information-circle" size={24} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  The PWD user needs to generate and share this code with you first.
                </Text>
              </View>
            </View>
          )}

          {step === 6 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.text }]} allowFontScaling={true}>
                Review Setup
              </Text>
              <View style={[styles.summaryBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <SummaryItem label="Name" value={profile.name || 'Not provided'} />
                <SummaryItem label="Language" value={profile.language === 'ur' ? 'Roman Urdu' : 'English'} />
                <SummaryItem label="Interaction Mode" value={profile.interactionMode === 'voice' ? 'Voice-First' : 'Touch-First'} />
                <SummaryItem label="PWD Code" value={profile.linkedPWDCode || 'Not provided'} />
              </View>
            </View>
          )}
        </ScrollView>

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
            disabled={isLoading}
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
  progressContainer: { padding: SPACING.lg, paddingTop: 60 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressText: { fontWeight: '700', flex: 1, marginLeft: SPACING.md },
  progressPercentage: { fontWeight: '700' },
  progressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  contentContainer: { padding: SPACING.lg, paddingBottom: 200 },
  centerContent: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  stepContent: { marginBottom: SPACING.xl },
  welcomeTitle: { ...TYPOGRAPHY.title, marginTop: 20 },
  welcomeSubtitle: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  welcomeDescription: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: 20 },
  stepTitle: { ...TYPOGRAPHY.heading, marginBottom: SPACING.md },
  stepDescription: { ...TYPOGRAPHY.body, marginBottom: SPACING.lg },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: SPACING.lg, marginVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  infoText: { ...TYPOGRAPHY.body, flex: 1 },
  navigationButtons: { flexDirection: 'row', padding: SPACING.lg, gap: 10, marginBottom: 20, backgroundColor: theme.background },
  summaryBox: { borderRadius: 12, borderWidth: 1, padding: SPACING.lg, marginVertical: SPACING.lg },
  summaryItem: { marginBottom: SPACING.md },
  summaryLabel: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  summaryValue: { ...TYPOGRAPHY.body, marginTop: SPACING.xs },
  confirmationText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.lg },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
});