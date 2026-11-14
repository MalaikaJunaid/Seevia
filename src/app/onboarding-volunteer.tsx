/**
 * Seevia Volunteer Onboarding
 * Touch-first (no big mic). Steps: Welcome → ID/CNIC Scan → Availability → Profile → Done
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, ActivityIndicator, Animated, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';

const TOTAL_STEPS = 5;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface VolProfile {
  fullName: string;
  phone: string;
  city: string;
  cnicUri: string | null;
  cnicVerified: boolean;
  availableAllDay: boolean;
  availFrom: string;
  availTo: string;
  availDays: string[];
  skills: string[];
}

const SKILL_OPTIONS = [
  'Navigation Help', 'Product Reading', 'Medical Escort',
  'Shopping Assistance', 'Transport', 'Sign Language', 'Indoor Mapping',
];

export default function VolunteerOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const [profile, setProfile] = useState<VolProfile>({
    fullName: '', phone: '', city: '',
    cnicUri: null, cnicVerified: false,
    availableAllDay: false, availFrom: '09:00', availTo: '18:00',
    availDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    skills: [],
  });

  const goNext = () => {
    if (step === 2 && !profile.cnicUri) {
      Alert.alert('CNIC / ID Required', 'Please scan your national ID card to continue. This is a one-time verification.');
      return;
    }
    hapticService.trigger('light');
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    Animated.timing(progressAnim, { toValue: next / TOTAL_STEPS, duration: 400, useNativeDriver: false }).start();
    if (next === TOTAL_STEPS) finalize();
  };

  const goBack = () => {
    hapticService.trigger('light');
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    Animated.timing(progressAnim, { toValue: prev / TOTAL_STEPS, duration: 300, useNativeDriver: false }).start();
  };

  const pickCNIC = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [16, 10],
      });
      if (!res.canceled && res.assets[0]) {
        setProfile(prev => ({ ...prev, cnicUri: res.assets[0].uri, cnicVerified: true }));
        hapticService.trigger('success');
        Alert.alert('✅ ID Scanned', 'Your identity document has been captured. It will be reviewed within 24 hours.');
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera. Please try again.');
    }
  };

  const toggleDay = (day: string) => {
    hapticService.trigger('light');
    setProfile(prev => ({
      ...prev,
      availDays: prev.availDays.includes(day)
        ? prev.availDays.filter(d => d !== day)
        : [...prev.availDays, day],
    }));
  };

  const toggleSkill = (skill: string) => {
    hapticService.trigger('light');
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const finalize = useCallback(async () => {
    setSaving(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in.');
        setSaving(false);
        return;
      }

      await FirestoreService.setDocument('users', user.uid, {
        ...profile,
        role: 'volunteer',
        setupComplete: true,
        casesResolved: 0,
        rating: 0,
        createdAt: Date.now(),
      });

      hapticService.trigger('success');
      setTimeout(() => router.replace('/volunteer-home' as any), 1200);
    } catch (error) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
      console.error('Finalize error:', error);
    } finally {
      setSaving(false);
    }
  }, [profile]);

  // ─── Progress Bar ───────────────────────────────────────────────────────
  const ProgressBar = () => (
    <View style={[styles.progressWrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.progressRow}>
        <Image source={require('../assets/images/seevia-braile.png')} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.cardBorder }]}>
            <Animated.View style={[styles.progressFill, {
              backgroundColor: theme.success,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
        </View>
      </View>
    </View>
  );

  // ─── Steps ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ProgressBar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Step 1: Welcome */}
        {step === 1 && (
          <View style={styles.centerStep}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.success}20` }]}>
              <Ionicons name="people" size={56} color={theme.success} />
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Become a Seevia Volunteer</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              Join our network of helpers and make a real difference in the lives of visually impaired people near you.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: 'location', text: 'Get matched with nearby PWD users' },
                { icon: 'shield-checkmark', text: 'One-time ID verification for safety' },
                { icon: 'time', text: 'Set your own availability hours' },
                { icon: 'star', text: 'Build your helper profile & rating' },
              ].map(f => (
                <View key={f.text} style={[styles.featureRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Ionicons name={f.icon as any} size={20} color={theme.success} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: CNIC / ID Verification */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Identity Verification</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              For the safety of PWD users, we require a one-time identity check. Your ID will not be shared publicly.
            </Text>

            <View style={[styles.idBox, { backgroundColor: theme.card, borderColor: profile.cnicVerified ? theme.success : theme.cardBorder }]}>
              {profile.cnicUri ? (
                <>
                  <Image source={{ uri: profile.cnicUri }} style={styles.idPreview} resizeMode="cover" />
                  <View style={[styles.verifiedBadge, { backgroundColor: `${theme.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                    <Text style={[styles.verifiedText, { color: theme.success }]}>ID Captured — Under Review</Text>
                  </View>
                </>
              ) : (
                <View style={styles.idPlaceholder}>
                  <Ionicons name="card-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.idPlaceholderText, { color: theme.textSecondary }]}>
                    CNIC / National ID Card
                  </Text>
                  <Text style={[styles.idHint, { color: theme.textTertiary }]}>
                    Make sure all 4 corners are visible in the photo
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.idBtns}>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: theme.success }]}
                onPress={pickCNIC}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.scanBtnText}>{profile.cnicUri ? 'Retake Photo' : 'Scan ID Card'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }]}>
              <Ionicons name="information-circle" size={18} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                We only accept government-issued photo ID (CNIC, Passport, or Driver's License). No unofficial documents.
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Availability */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Your Availability</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              When are you available to help? This helps us match you with nearby PWD users at the right time.
            </Text>

            {/* All Day toggle */}
            <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Ionicons name="sunny-outline" size={22} color={theme.warning} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Available 24 Hours</Text>
                <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>Respond to any request, any time</Text>
              </View>
              <Switch
                value={profile.availableAllDay}
                onValueChange={v => { setProfile(p => ({ ...p, availableAllDay: v })); hapticService.trigger('light'); }}
                trackColor={{ true: theme.success, false: theme.cardBorder }}
                thumbColor="#FFF"
              />
            </View>

            {/* Time range */}
            {!profile.availableAllDay && (
              <View style={[styles.timeRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>From</Text>
                  <TextInput
                    style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
                    value={profile.availFrom}
                    onChangeText={t => setProfile(p => ({ ...p, availFrom: t }))}
                    placeholder="09:00"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} style={{ marginTop: 24 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>To</Text>
                  <TextInput
                    style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
                    value={profile.availTo}
                    onChangeText={t => setProfile(p => ({ ...p, availTo: t }))}
                    placeholder="18:00"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </View>
            )}

            {/* Days */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: SPACING.md }]}>Available Days</Text>
            <View style={styles.daysRow}>
              {DAYS.map(day => {
                const active = profile.availDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, {
                      backgroundColor: active ? theme.success : theme.card,
                      borderColor: active ? theme.success : theme.cardBorder,
                    }]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayText, { color: active ? '#FFF' : theme.textSecondary }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 4: Personal Info & Skills */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Your Profile</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              Tell us a bit about yourself so PWD users can trust you.
            </Text>

            {[
              { label: 'Full Name', value: profile.fullName, key: 'fullName', placeholder: 'e.g. Ahmed Khan', keyboard: 'default' },
              { label: 'Phone Number', value: profile.phone, key: 'phone', placeholder: '+92 300 1234567', keyboard: 'phone-pad' },
              { label: 'City', value: profile.city, key: 'city', placeholder: 'e.g. Islamabad', keyboard: 'default' },
            ].map(f => (
              <View key={f.key} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
                  value={f.value}
                  onChangeText={t => setProfile(p => ({ ...p, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.textTertiary}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: SPACING.md }]}>Your Skills (select all that apply)</Text>
            <View style={styles.skillsGrid}>
              {SKILL_OPTIONS.map(skill => {
                const active = profile.skills.includes(skill);
                return (
                  <TouchableOpacity
                    key={skill}
                    style={[styles.skillChip, {
                      backgroundColor: active ? `${theme.primary}20` : theme.card,
                      borderColor: active ? theme.primary : theme.cardBorder,
                    }]}
                    onPress={() => toggleSkill(skill)}
                  >
                    <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={active ? theme.primary : theme.textTertiary} />
                    <Text style={[styles.skillText, { color: active ? theme.primary : theme.textSecondary }]}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 5: Done */}
        {step === TOTAL_STEPS && (
          <View style={styles.centerStep}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.success}20` }]}>
              {saving ? <ActivityIndicator size="large" color={theme.success} />
                : <Ionicons name="checkmark-circle" size={56} color={theme.success} />}
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              {saving ? 'Setting Up...' : 'Welcome Aboard!'}
            </Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              {saving ? 'Saving your profile to Seevia...'
                : `You're all set, ${profile.fullName || 'Volunteer'}! Your ID is under review. You'll be able to accept cases once verified.`}
            </Text>

            {!saving && (
              <View style={styles.summaryBox}>
                {[
                  { icon: 'time', label: 'Availability', value: profile.availableAllDay ? '24 hours' : `${profile.availFrom} – ${profile.availTo}` },
                  { icon: 'calendar', label: 'Days', value: profile.availDays.join(', ') || 'Not set' },
                  { icon: 'ribbon', label: 'Skills', value: profile.skills.length > 0 ? profile.skills.join(', ') : 'None selected' },
                ].map(s => (
                  <View key={s.label} style={[styles.summaryRow, { borderBottomColor: theme.cardBorder }]}>
                    <Ionicons name={s.icon as any} size={16} color={theme.primary} />
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{s.label}:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{s.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Bottom nav */}
      {step < TOTAL_STEPS && (
        <View style={[styles.navBar, { paddingBottom: insets.bottom + 12 }]}>
          {step > 1 && (
            <TouchableOpacity style={[styles.backBtn, { borderColor: theme.cardBorder }]} onPress={goBack}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.success, flex: step === 1 ? 1 : undefined }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  logo: { width: 36, height: 36 },
  progressLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  scroll: { padding: SPACING.lg, paddingBottom: 140 },
  centerStep: { alignItems: 'center', paddingVertical: SPACING.lg },
  stepContent: { paddingVertical: SPACING.sm },
  stepTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  stepDesc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: SPACING.lg },
  iconCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  featureList: { gap: SPACING.sm, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  featureText: { fontSize: 14, fontWeight: '600', flex: 1 },
  idBox: { borderRadius: RADIUS.xl, borderWidth: 2, overflow: 'hidden', marginBottom: SPACING.md, minHeight: 160, justifyContent: 'center', alignItems: 'center' },
  idPlaceholder: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  idPlaceholderText: { fontWeight: '700', fontSize: 15 },
  idHint: { fontSize: 12, textAlign: 'center' },
  idPreview: { width: '100%', height: 200 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, justifyContent: 'center' },
  verifiedText: { fontWeight: '700', fontSize: 13 },
  idBtns: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  scanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 14, borderRadius: RADIUS.lg },
  scanBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.md },
  toggleLabel: { fontWeight: '700', fontSize: 14 },
  toggleSub: { fontSize: 11, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.md },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  dayChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  dayText: { fontWeight: '700', fontSize: 13 },
  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 48, fontSize: 14 },
  timeInput: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, height: 46, fontSize: 14, textAlign: 'center' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  skillText: { fontSize: 12, fontWeight: '700' },
  summaryBox: { width: '100%', marginTop: SPACING.md, gap: SPACING.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 12, fontWeight: '600', minWidth: 80 },
  summaryValue: { flex: 1, fontSize: 13, fontWeight: '700' },
  navBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, flexDirection: 'row', gap: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  backBtnText: { fontWeight: '700', fontSize: 14 },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 14, borderRadius: RADIUS.lg },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
