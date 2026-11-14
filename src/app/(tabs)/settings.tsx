import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED: Default Imports (No curly braces)
import BackHeader from '@/components/common/BackHeader';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ScreenLayout from '@/components/common/ScreenLayout';
import Switch from '@/components/common/Switch';

// Services & Hooks
import { DARK_THEME as colors } from '@/theme/colors';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [medications, setMedications] = useState<string[]>([]);
  const [newMed, setNewMed] = useState('');
  const [medTakenToday, setMedTakenToday] = useState(false);
  const today = new Date().toDateString();

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      AuthService.getUserRole(currentUser.uid).then((role) => {
        setUserRole(role || 'User');
      });
    }
    // Load medications and today's taken status
    AsyncStorage.getItem('seevia_medications').then(val => {
      if (val) setMedications(JSON.parse(val));
    }).catch(() => {});
    AsyncStorage.getItem(`seevia_med_taken_${today}`).then(val => {
      setMedTakenToday(val === 'true');
    }).catch(() => {});

    // Voice command listeners
    const medSub = DeviceEventEmitter.addListener('VOICE_UPDATE_MEDICATION', () => {
      TtsService.speak('Medication screen khul gaya. Naya medication add karein ya taken mark karein.');
    });
    const checkSub = DeviceEventEmitter.addListener('VOICE_CHECK_MEDICATION', async () => {
      const taken = await AsyncStorage.getItem(`seevia_med_taken_${today}`).catch(() => null);
      if (taken === 'true') {
        TtsService.speak('Haan, aaj aapne apni dawai li hai. Shaabaash!');
      } else {
        const meds = await AsyncStorage.getItem('seevia_medications').catch(() => null);
        const list = meds ? JSON.parse(meds) : [];
        if (list.length === 0) {
          TtsService.speak('Aapki medication list mein koi dawai nahi hai. Settings mein add karein.');
        } else {
          TtsService.speak(`Aaj aapne dawai nahi li. Yaad dihani: ${list.slice(0,3).join(', ')}.`);
        }
      }
    });

    return () => { medSub.remove(); checkSub.remove(); };
  }, []);


  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', onPress: () => TtsService.speak('Sign out cancelled') },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              setIsLoading(true);
              TtsService.speak('Signing out...');
              await AuthService.signOut();
              TtsService.speak('You have been signed out');
              router.replace('/');
            } catch (error: any) {
              console.error('Sign out error:', error);
              TtsService.speak('Error signing out. Please try again.');
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <BackHeader
        title="Settings"
        subtitle="Preferences and personalization"
        icon={<Ionicons name="settings" size={40} color={colors.primary} />}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <Card padding={true}>
            <View style={styles.profileRow}>
              <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {user?.displayName || 'User'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {user?.email || 'Not available'}
                </Text>
                <Text style={[styles.profileRole, { color: colors.primary }]}>
                  Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Voice Assistant */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Voice Assistant</Text>
          <Card padding={false}>
            <Switch
              label="Assistant Voice"
              description="Enable auditory feedback"
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              accessibilityLabel="Voice assistant toggle"
            />
          </Card>
        </View>

        {/* Haptics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Haptics</Text>
          <Card padding={false}>
            <Switch
              label="Tactile Guidance"
              description="Vibration for navigation"
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              accessibilityLabel="Haptic feedback toggle"
            />
          </Card>
        </View>
        {/* Medication Tracker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💊 Medication Tracker</Text>
          <Card padding={true}>
            <TouchableOpacity
              style={[styles.medTakenBtn, { backgroundColor: medTakenToday ? colors.success : `${colors.primary}22`, borderColor: medTakenToday ? colors.success : colors.primary }]}
              onPress={async () => {
                const next = !medTakenToday;
                setMedTakenToday(next);
                await AsyncStorage.setItem(`seevia_med_taken_${today}`, String(next));
                TtsService.speak(next ? 'Dawai li hui mark ho gayi. Shaabaash!' : 'Dawai taken mark hataa di.');
                hapticService.trigger('success');
              }}
            >
              <Ionicons name={medTakenToday ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={medTakenToday ? colors.success : colors.primary} />
              <Text style={{ color: medTakenToday ? colors.success : colors.primary, fontWeight: '700', fontSize: 15 }}>
                {medTakenToday ? 'Taken Today ✓' : 'Mark as Taken Today'}
              </Text>
            </TouchableOpacity>

            {medications.map((med, i) => (
              <View key={i} style={styles.medRow}>
                <Text style={{ color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' }}>{med}</Text>
                <TouchableOpacity onPress={async () => {
                  const updated = medications.filter((_, idx) => idx !== i);
                  setMedications(updated);
                  await AsyncStorage.setItem('seevia_medications', JSON.stringify(updated));
                  TtsService.speak(`${med} list se remove ho gaya.`);
                }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addMedRow}>
              <TextInput
                style={[styles.medInput, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                placeholder="Add medication name..."
                placeholderTextColor={colors.textTertiary}
                value={newMed}
                onChangeText={setNewMed}
              />
              <TouchableOpacity
                style={[styles.addMedBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!newMed.trim()) return;
                  const updated = [...medications, newMed.trim()];
                  setMedications(updated);
                  await AsyncStorage.setItem('seevia_medications', JSON.stringify(updated));
                  TtsService.speak(`${newMed} medication list mein add ho gaya.`);
                  setNewMed('');
                }}
              >
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        <Button
          title="Save Settings"
          onPress={() => {
            hapticService.trigger('success');
            TtsService.speak("Settings updated");
          }}
          style={styles.saveButton}
          fullWidth
        />

        {/* Sign Out Button */}
        <Button
          title={isLoading ? "Signing out..." : "Sign Out"}
          onPress={handleSignOut}
          disabled={isLoading}
          style={[styles.signOutButton, { backgroundColor: colors.cardBorder }]}
          fullWidth
          icon={<Ionicons name="log-out-outline" size={20} color={colors.text} />}
        />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { padding: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.heading, marginBottom: SPACING.sm },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  profileInfo: { flex: 1 },
  profileName: { ...TYPOGRAPHY.heading, marginBottom: SPACING.xs },
  profileEmail: { ...TYPOGRAPHY.body, marginBottom: SPACING.xs },
  profileRole: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  saveButton: { marginTop: SPACING.lg },
  signOutButton: { marginTop: SPACING.md, borderTopWidth: 1 },
  medTakenBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 2, marginBottom: SPACING.md },
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  addMedRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  medInput: { flex: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 44, fontSize: 14 },
  addMedBtn: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
});