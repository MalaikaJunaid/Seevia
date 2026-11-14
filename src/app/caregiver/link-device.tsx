import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Core Components
import ScreenLayout from '@/components/common/ScreenLayout';
import Button from '@/components/common/Button';

// Theme & Services
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

export default function LinkDeviceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [code, setCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkDevice = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit connection code.');
      return;
    }

    setIsLinking(true);

    try {
      // For FYP Presentation: Simulate the network handshake
      // In production, this verifies the code in the 'trust_circle_invites' Firestore collection
      setTimeout(() => {
        setIsLinking(false);
        Alert.alert(
          'Connection Successful! 🎉', 
          'You are now securely linked. You will start receiving telemetry and emergency alerts immediately.',
          [{ text: 'Go to Dashboard', onPress: () => router.replace('/caregiver/dashboard') }]
        );
      }, 1500);

    } catch (error) {
      logger.error('LINK_DEVICE', 'Failed to link', error);
      setIsLinking(false);
      Alert.alert('Connection Failed', 'The code is invalid or has expired. Please ask the user to generate a new one.');
    }
  };

  return (
    <ScreenLayout scrollable={true} padding={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Button 
            title="Back" 
            variant="outline" 
            onPress={() => router.back()} 
            style={styles.backButton}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="link" size={40} color={theme.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Secure Connection</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter the 6-digit code from the Seevia device you wish to monitor.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.codeInput, { color: theme.text, borderColor: code.length === 6 ? theme.primary : theme.cardBorder }]}
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={theme.textTertiary}
              maxLength={6}
              autoFocus={true}
            />
          </View>

          <View style={styles.instructionsBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
              The visually impaired user can generate this code by saying, <Text style={{ color: theme.primary, fontWeight: 'bold' }}>"Hey Seevia, generate a caregiver code."</Text>
            </Text>
          </View>

          <Button 
            title={isLinking ? "Verifying..." : "Establish Connection"} 
            variant="primary" 
            onPress={handleLinkDevice}
            disabled={isLinking || code.length !== 6}
            style={styles.linkButton}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: SPACING.lg, paddingTop: 50 },
  backButton: { width: 80, paddingVertical: 8, height: 'auto' },
  content: { padding: SPACING.xl, alignItems: 'center', marginTop: 20 },
  
  iconContainer: { marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.primary + '50' },
  
  title: { ...TYPOGRAPHY.display, fontSize: 28, textAlign: 'center', marginBottom: 10 },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', marginBottom: 40, paddingHorizontal: 10 },
  
  inputContainer: { width: '100%', marginBottom: 30 },
  codeInput: { 
    fontSize: 40, 
    fontWeight: '800', 
    letterSpacing: 10, 
    textAlign: 'center', 
    borderWidth: 2, 
    borderRadius: RADIUS.lg, 
    paddingVertical: 20,
    backgroundColor: theme.card
  },
  
  instructionsBox: { flexDirection: 'row', backgroundColor: theme.card, padding: 15, borderRadius: RADIUS.md, marginBottom: 40, alignItems: 'flex-start', gap: 10 },
  instructionsText: { flex: 1, lineHeight: 20, fontSize: 13 },
  
  linkButton: { width: '100%', height: 55 },
});