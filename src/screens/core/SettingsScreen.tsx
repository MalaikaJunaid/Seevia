import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { AuthService } from '@/src/services/firebase/auth.service';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Safety & SOS [Module 5]</Text>
        <View style={styles.card}>
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
        <Text style={styles.sectionLabel}>Accessibility [Module 2]</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowText}>Voice Assistant (Suno Seevia)</Text>
            <Switch 
              value={isVoiceActive} 
              onValueChange={setIsVoiceActive}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
          <TouchableOpacity 
            style={styles.testBtn} 
            onPress={() => TextToSpeechService.speak("Voice assistant is active and clear.")}
          >
            <Text style={styles.testBtnText}>Test Voice Output</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut} 
          variant="danger" 
        />
        <Text style={styles.version}>Seevia Version 1.0.0 (COMSATS 60% Defense)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 10, fontWeight: 'bold', letterSpacing: 1 },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, elevation: 2, gap: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  testBtn: { padding: 10, alignItems: 'center' },
  testBtnText: { color: colors.primary, fontWeight: '600' },
  footer: { padding: 40, alignItems: 'center' },
  version: { marginTop: 20, color: colors.textSecondary, fontSize: 12 },
});

export default SettingsScreen;
