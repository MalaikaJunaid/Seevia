/**
 * Seevia Profile Screen — Full PWD Profile
 * Voice & touch: name, allergies, medical info, medicine schedule, caregiver link, sign out
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Switch, DeviceEventEmitter, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { UserProfileService } from '@/services/firebase/userProfile.service';
import { PWDConnectionService } from '@/services/firebase/pwdConnection.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

interface MedSchedule {
  name: string;
  time: string; // "08:00"
  notes: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [name, setName]               = useState('');
  const [userId, setUserId]           = useState('');
  const [email, setEmail]             = useState('');
  const [age, setAge]                 = useState('');
  const [bloodType, setBloodType]     = useState('');
  const [allergies, setAllergies]     = useState('');
  const [medInstructions, setMedInstructions] = useState('');
  const [inviteCode, setInviteCode]   = useState('');
  const [generating, setGenerating]   = useState(false);
  const [voiceEnabled, setVoiceEnabled]   = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [medicines, setMedicines]     = useState<MedSchedule[]>([]);
  const [newMedName, setNewMedName]   = useState('');
  const [newMedTime, setNewMedTime]   = useState('08:00');
  const [newMedNote, setNewMedNote]   = useState('');

  useEffect(() => {
    loadProfile();

    const checkSub = DeviceEventEmitter.addListener('VOICE_CHECK_MEDICATION', async () => {
      const meds = await AsyncStorage.getItem('seevia_medications').catch(() => null);
      const list: MedSchedule[] = meds ? JSON.parse(meds) : [];
      if (list.length === 0) {
        TtsService.speak('Koi medication schedule nahi hai. Profile mein add karein.');
      } else {
        TtsService.speak(`Aapki dawaiyan: ${list.map(m => `${m.name} ${m.time} baje`).join('. ')}`);
      }
    });
    return () => checkSub.remove();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.uid.slice(0, 8).toUpperCase());
      setEmail(user.email || '');

      const profile = await UserProfileService.getUserProfile(user.uid);
      if (profile) {
        setName(profile.fullName || profile.name || '');
        setAge((profile as any).age?.toString() || '');
        setBloodType((profile as any).bloodType || '');
        setAllergies((profile.allergies || []).join(', '));
        setMedInstructions((profile as any).medicalInstructions || '');
        if ((profile as any).inviteCode) setInviteCode((profile as any).inviteCode);
      }

      const medsRaw = await AsyncStorage.getItem('seevia_medications').catch(() => null);
      if (medsRaw) setMedicines(JSON.parse(medsRaw));

    } catch { /* use whatever loaded */ }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) { TtsService.speak('Login required.'); return; }

      await UserProfileService.updateUserProfile(user.uid, {
        fullName: name,
        age: age ? parseInt(age) : undefined,
        bloodType,
        allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
        medicalInstructions: medInstructions,
      } as any);

      hapticService.trigger('success');
      TtsService.speak('Profile save ho gayi. Shukriya!');
      Alert.alert('✅ Saved', 'Your profile has been updated.');
    } catch (e) {
      TtsService.speak('Save nahi ho saka. Network check karein.');
      hapticService.trigger('error');
    } finally {
      setSaving(false);
    }
  };

  const generateInviteCode = async () => {
    setGenerating(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      const code = await PWDConnectionService.createInvitationCode(user.uid, name || 'Seevia User');
      setInviteCode(code);
      hapticService.trigger('success');
      TtsService.speak(`Aapka caregiver link code hai: ${code.split('').join(', ')}. Caregiver ko yeh code dein.`);
    } catch {
      TtsService.speak('Code generate nahi hua.');
    } finally {
      setGenerating(false);
    }
  };

  const addMedicine = async () => {
    if (!newMedName.trim()) { TtsService.speak('Dawai ka naam likhein.'); return; }
    const updated = [...medicines, { name: newMedName.trim(), time: newMedTime, notes: newMedNote }];
    setMedicines(updated);
    await AsyncStorage.setItem('seevia_medications', JSON.stringify(updated));
    TtsService.speak(`${newMedName} ${newMedTime} baje ke liye add ho gayi.`);
    hapticService.trigger('success');
    setNewMedName(''); setNewMedNote('');
  };

  const removeMedicine = async (i: number) => {
    const name = medicines[i].name;
    const updated = medicines.filter((_, idx) => idx !== i);
    setMedicines(updated);
    await AsyncStorage.setItem('seevia_medications', JSON.stringify(updated));
    TtsService.speak(`${name} medication list se remove ho gayi.`);
  };

  const signOut = () => {
    Alert.alert('Sign Out', 'Kya aap sign out karna chahte hain?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          TtsService.speak('Sign out ho rahe hain. Khuda Hafiz!');
          await AuthService.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={{ color: theme.primary, marginTop: 12, fontWeight: '600' }}>Profile load ho rahi hai...</Text>
    </View>
  );

  const Section = ({ title, icon }: { title: string; icon: string }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={theme.primary} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );

  const Field = ({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder, height: multiline ? 80 : 46 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: `${theme.primary}22` }]}>
            <Ionicons name="person" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.heroName, { color: theme.text }]}>{name || 'Seevia User'}</Text>
          <Text style={[styles.heroId, { color: theme.textSecondary }]}>ID: {userId} · {email}</Text>
          <TouchableOpacity
            onPress={() => TtsService.speak(`Aapka naam ${name}. Allergies: ${allergies || 'none'}. Blood type: ${bloodType || 'not set'}.`)}
            style={[styles.readBtn, { backgroundColor: `${theme.primary}18` }]}
          >
            <Ionicons name="volume-high" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>Hear Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Section title="Personal Info" icon="person-outline" />
          <Field label="Full Name" value={name} onChange={setName} placeholder="Aapka poora naam" />
          <Field label="Age" value={age} onChange={setAge} placeholder="Umar" keyboardType="numeric" />
          <Field label="Blood Type" value={bloodType} onChange={setBloodType} placeholder="e.g. O+" />
        </View>

        {/* Medical Alerts */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Section title="Medical Alerts" icon="medical-outline" />
          <Field
            label="Allergies (comma separated)"
            value={allergies}
            onChange={setAllergies}
            placeholder="e.g. peanuts, dairy, gluten"
          />
          <Field
            label="Medical Instructions"
            value={medInstructions}
            onChange={setMedInstructions}
            placeholder="Special instructions for emergency responders..."
            multiline
          />
        </View>

        {/* Medicine Schedule */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Section title="Medicine Schedule" icon="time-outline" />
          {medicines.map((med, i) => (
            <View key={i} style={[styles.medRow, { borderBottomColor: theme.cardBorder }]}>
              <Ionicons name="medical" size={16} color={theme.primary} />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={[styles.medName, { color: theme.text }]}>{med.name}</Text>
                <Text style={[styles.medTime, { color: theme.textSecondary }]}>{med.time} baje{med.notes ? ` · ${med.notes}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => removeMedicine(i)}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: SPACING.sm }]}>Add Medicine</Text>
          <View style={styles.addMedRow}>
            <TextInput
              style={[styles.medInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder, flex: 2 }]}
              placeholder="Medicine name"
              placeholderTextColor={theme.textTertiary}
              value={newMedName}
              onChangeText={setNewMedName}
            />
            <TextInput
              style={[styles.medInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder, flex: 1 }]}
              placeholder="Time e.g. 08:00"
              placeholderTextColor={theme.textTertiary}
              value={newMedTime}
              onChangeText={setNewMedTime}
            />
          </View>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder, height: 46, marginBottom: SPACING.sm }]}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textTertiary}
            value={newMedNote}
            onChangeText={setNewMedNote}
          />
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: theme.primary }]} onPress={addMedicine}>
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.smallBtnText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Caregiver Link */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Section title="Caregiver Link" icon="link-outline" />
          <Text style={[styles.linkDesc, { color: theme.textSecondary }]}>
            Generate a 6-digit code and share it with your caregiver to link accounts.
          </Text>
          {inviteCode ? (
            <View style={[styles.codeBox, { backgroundColor: `${theme.primary}18`, borderColor: theme.primary }]}>
              <Text style={[styles.codeText, { color: theme.primary }]}>{inviteCode}</Text>
              <TouchableOpacity onPress={() => TtsService.speak(`Code: ${inviteCode.split('').join(', ')}`)}>
                <Ionicons name="volume-high" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: generating ? theme.cardBorder : `${theme.primary}22`, borderColor: theme.primary, borderWidth: 1 }]}
            onPress={generateInviteCode}
            disabled={generating}
          >
            {generating ? <ActivityIndicator size="small" color={theme.primary} />
              : <><Ionicons name="qr-code-outline" size={16} color={theme.primary} /><Text style={[styles.smallBtnText, { color: theme.primary }]}>{inviteCode ? 'New Code' : 'Generate Code'}</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Section title="Preferences" icon="settings-outline" />
          <View style={styles.prefRow}>
            <Ionicons name="volume-high" size={18} color={theme.primary} />
            <Text style={[styles.prefLabel, { color: theme.text }]}>Voice Guidance</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={v => { setVoiceEnabled(v); TtsService.speak(v ? 'Voice on.' : 'Voice off.'); }}
              trackColor={{ true: theme.primary, false: theme.cardBorder }}
              thumbColor="#FFF"
            />
          </View>
          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="radio-button-on" size={18} color={theme.secondary} />
            <Text style={[styles.prefLabel, { color: theme.text }]}>Haptic Feedback</Text>
            <Switch
              value={hapticEnabled}
              onValueChange={v => { setHapticEnabled(v); TtsService.speak(v ? 'Haptics on.' : 'Haptics off.'); }}
              trackColor={{ true: theme.secondary, false: theme.cardBorder }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saving ? theme.cardBorder : theme.primary }]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" />
            : <><Ionicons name="save-outline" size={20} color="#FFF" /><Text style={styles.saveBtnText}>Save Profile</Text></>
          }
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: `${theme.danger}18`, borderColor: theme.danger }]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.signOutText, { color: theme.danger }]}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', padding: SPACING.xl },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  heroName: { fontSize: 24, fontWeight: '800' },
  heroId: { fontSize: 12, marginTop: 4 },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginTop: SPACING.sm },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  fieldWrap: { marginBottom: SPACING.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 14 },
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  medName: { fontWeight: '700', fontSize: 14 },
  medTime: { fontSize: 12, marginTop: 2 },
  addMedRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  medInput: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, height: 44, fontSize: 13 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md },
  smallBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  linkDesc: { fontSize: 13, lineHeight: 20, marginBottom: SPACING.md },
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, marginBottom: SPACING.md },
  codeText: { fontSize: 32, fontWeight: '900', letterSpacing: 8 },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: SPACING.sm },
  prefLabel: { flex: 1, fontWeight: '600', fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, paddingVertical: 16, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, marginBottom: 40 },
  signOutText: { fontWeight: '800', fontSize: 15 },
});