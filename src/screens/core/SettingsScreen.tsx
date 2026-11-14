import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { hapticService } from '@/services/common/haptic.service';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';

const SettingsScreen = () => {
  const router = useRouter();
  const user = AuthService.getCurrentUser();
  const [sosContact, setSosContact] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    const profile = await FirestoreService.getDocument<any>('users', user.uid);
    if (profile?.emergencyContact) setSosContact(profile.emergencyContact);
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    hapticService.trigger('warning');
    router.replace('/auth/login');
  };

  const saveEmergencyContact = async () => {
    if (!user) return;
    try {
      await FirestoreService.setDocument('users', user.uid, { emergencyContact: sosContact });
      await hapticService.trigger('success');
      await TextToSpeechService.speak("Emergency contact updated.");
    } catch (e) {
      TextToSpeechService.speak("Failed to save contact.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Safety & SOS</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Input 
            label="UAE Caregiver Number"
            value={sosContact}
            onChangeText={setSosContact}
            placeholder="+971 XX XXX XXXX"
            keyboardType="phone-pad"
          />
          <Button title="Update Contact" onPress={saveEmergencyContact} variant="outline" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Accessibility</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: theme.text }]}>Voice Assistant (Hey Seevia)</Text>
            <Switch 
              value={isVoiceActive} 
              onValueChange={setIsVoiceActive}
              trackColor={{ false: theme.cardBorder, true: theme.primary }}
            />
          </View>
          <TouchableOpacity 
            style={[styles.testBtn, { borderBottomColor: theme.primary }]} 
            onPress={() => TextToSpeechService.speak("Voice assistant is active and clear.")}
          >
            <Text style={[styles.testBtnText, { color: theme.primary }]}>Test Voice Output</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut} 
          variant="danger" 
        />
        <Text style={[styles.version, { color: theme.textSecondary }]}>Seevia Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.lg, paddingTop: SPACING.xl },
  title: { fontSize: 32, fontWeight: '800' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: SPACING.md, letterSpacing: 1, textTransform: 'uppercase' as const },
  card: { padding: SPACING.lg, borderRadius: RADIUS.lg, gap: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16, fontWeight: '500' },
  testBtn: { padding: SPACING.md, alignItems: 'center', borderBottomWidth: 2 },
  testBtnText: { fontWeight: '600' },
  footer: { padding: SPACING.xl, alignItems: 'center' },
  version: { marginTop: SPACING.lg, fontSize: 12 },
});

export default SettingsScreen;
