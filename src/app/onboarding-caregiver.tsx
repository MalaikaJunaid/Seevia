/**
 * Seevia Caregiver Onboarding
 * Touch-first. Steps: Welcome → Link PWD code → Notifications → Profile → Done
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { PWDConnectionService } from '@/services/firebase/pwdConnection.service';

const TOTAL_STEPS = 4;

interface LinkedPWD {
  code: string;
  name: string;
  uid: string;
}

export default function CaregiverOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]     = useState('');
  const [relation, setRelation] = useState('Family Member');
  const [linkCode, setLinkCode] = useState('');
  const [linkedPWDs, setLinkedPWDs] = useState<LinkedPWD[]>([]);
  const [linkError, setLinkError] = useState('');

  const goNext = async () => {
    if (step === TOTAL_STEPS - 1) { await finalize(); return; }
    hapticService.trigger('light');
    const next = Math.min(step + 1, TOTAL_STEPS);
    setStep(next);
    Animated.timing(progressAnim, { toValue: next / TOTAL_STEPS, duration: 400, useNativeDriver: false }).start();
  };

  const goBack = () => {
    hapticService.trigger('light');
    const prev = Math.max(step - 1, 1);
    setStep(prev);
    Animated.timing(progressAnim, { toValue: prev / TOTAL_STEPS, duration: 300, useNativeDriver: false }).start();
  };

  const linkPWD = async () => {
    if (!linkCode.trim() || linkCode.trim().length < 4) {
      setLinkError('Please enter a valid 6-digit link code from your PWD.');
      return;
    }
    setLinking(true);
    setLinkError('');
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      const result = await PWDConnectionService.validateAndUseCode(linkCode.trim(), user.uid, fullName || 'Caregiver');
      if (result?.pwd_uid) {
        const newLink: LinkedPWD = { code: linkCode.trim(), name: result.pwd_name || 'PWD User', uid: result.pwd_uid };
        setLinkedPWDs(prev => [...prev, newLink]);
        setLinkCode('');
        hapticService.trigger('success');
        Alert.alert('✅ Linked!', `You are now connected to ${newLink.name}. You can now view their pantry, shopping list, and receive their emergency alerts.`);
      } else {
        setLinkError('Code not found or expired. Ask PWD to generate a new code.');
        hapticService.trigger('error');
      }
    } catch {
      setLinkError('Connection failed. Check your internet and try again.');
      hapticService.trigger('error');
    } finally {
      setLinking(false);
    }
  };

  const removePWD = (uid: string) => {
    setLinkedPWDs(prev => prev.filter(p => p.uid !== uid));
    hapticService.trigger('light');
  };

  const finalize = async () => {
    setSaving(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in.');
        setSaving(false);
        return;
      }

      await FirestoreService.setDocument('users', user.uid, {
        fullName, phone, relation,
        role: 'caregiver',
        linkedPWDs: linkedPWDs.map(p => p.uid),
        setupComplete: true,
        createdAt: Date.now(),
      });

      hapticService.trigger('success');
      setStep(TOTAL_STEPS);
      Animated.timing(progressAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      setTimeout(() => router.replace('/caregiver' as any), 1500);
    } catch (error) {
      Alert.alert('Error', 'Could not save. Please try again.');
      console.error('Finalize error:', error);
    } finally {
      setSaving(false);
    }
  };

  const RELATIONS = ['Family Member', 'Spouse', 'Parent', 'Child', 'Friend', 'Professional Caregiver'];

  // ─── Progress ────────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <View style={[styles.progressWrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.progressRow}>
        <Image source={require('../assets/images/seevia-braile.png')} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.cardBorder }]}>
            <Animated.View style={[styles.progressFill, {
              backgroundColor: theme.info,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ProgressBar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Step 1: Welcome */}
        {step === 1 && (
          <View style={styles.centerStep}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.info}20` }]}>
              <Ionicons name="heart" size={56} color={theme.info} />
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Caregiver Account</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              You are setting up a caregiver account. You'll be able to monitor and support the people you care for — all from one place.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: 'location', text: 'Live location of your PWD' },
                { icon: 'basket', text: 'View & update their pantry & shopping list' },
                { icon: 'medical', text: 'Manage and track medication schedules' },
                { icon: 'notifications', text: 'Emergency & health alerts in real time' },
              ].map(f => (
                <View key={f.text} style={[styles.featureRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Ionicons name={f.icon as any} size={20} color={theme.info} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Personal Info + Link PWD */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Your Information</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              Tell us about yourself. You can link one or more PWD users using their invite code.
            </Text>

            {[
              { label: 'Your Full Name', value: fullName, setter: setFullName, placeholder: 'e.g. Sara Ahmed', keyboard: 'default' },
              { label: 'Your Phone', value: phone, setter: setPhone, placeholder: '+92 300 1234567', keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.label} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
                  value={f.value} onChangeText={f.setter}
                  placeholder={f.placeholder} placeholderTextColor={theme.textTertiary}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Relationship</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                {RELATIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.relChip, {
                      backgroundColor: relation === r ? theme.info : theme.card,
                      borderColor: relation === r ? theme.info : theme.cardBorder,
                    }]}
                    onPress={() => { setRelation(r); hapticService.trigger('light'); }}
                  >
                    <Text style={[styles.relText, { color: relation === r ? '#FFF' : theme.textSecondary }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Link PWD */}
            <View style={[styles.linkBox, { backgroundColor: `${theme.info}10`, borderColor: `${theme.info}33` }]}>
              <Text style={[styles.linkTitle, { color: theme.text }]}>Link a PWD (Optional)</Text>
              <Text style={[styles.linkSub, { color: theme.textSecondary }]}>
                Ask your PWD to open Seevia → Profile → Generate Invite Code, then enter it below.
              </Text>
              <View style={styles.linkInputRow}>
                <TextInput
                  style={[styles.linkInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: linkError ? theme.danger : theme.cardBorder }]}
                  value={linkCode}
                  onChangeText={t => { setLinkCode(t); setLinkError(''); }}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[styles.linkBtn, { backgroundColor: linking ? theme.cardBorder : theme.info }]}
                  onPress={linkPWD}
                  disabled={linking}
                >
                  {linking ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.linkBtnText}>Link</Text>}
                </TouchableOpacity>
              </View>
              {linkError ? <Text style={[styles.errorText, { color: theme.danger }]}>{linkError}</Text> : null}

              {linkedPWDs.map(pwd => (
                <View key={pwd.uid} style={[styles.linkedRow, { backgroundColor: `${theme.success}15`, borderColor: theme.success }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  <Text style={[styles.linkedName, { color: theme.text }]}>{pwd.name}</Text>
                  <TouchableOpacity onPress={() => removePWD(pwd.uid)}>
                    <Ionicons name="close-circle" size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Emergency Alerts</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              You will be notified instantly for all of these events. Make sure notifications are enabled on your device.
            </Text>

            {[
              { icon: 'body', color: theme.danger, title: 'Fall Detection', desc: 'Instant alert if your PWD falls' },
              { icon: 'alert-circle', color: theme.danger, title: 'SOS Triggered', desc: 'When PWD activates emergency SOS' },
              { icon: 'medical', color: theme.warning, title: 'Missed Medication', desc: 'If a medicine dose is skipped' },
              { icon: 'location', color: theme.info, title: 'Location Updates', desc: 'Real-time location of your PWD' },
              { icon: 'basket', color: theme.primary, title: 'Low Stock Alert', desc: 'When pantry items run low' },
            ].map(a => (
              <View key={a.title} style={[styles.alertRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={[styles.alertIcon, { backgroundColor: `${a.color}20` }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={[styles.alertTitle, { color: theme.text }]}>{a.title}</Text>
                  <Text style={[styles.alertDesc, { color: theme.textSecondary }]}>{a.desc}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              </View>
            ))}
          </View>
        )}

        {/* Step 4: Done */}
        {step === TOTAL_STEPS && (
          <View style={styles.centerStep}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.success}20` }]}>
              {saving ? <ActivityIndicator size="large" color={theme.success} />
                : <Ionicons name="heart-circle" size={56} color={theme.success} />}
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              {saving ? 'Setting up...' : `Welcome, ${fullName || 'Caregiver'}!`}
            </Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              {saving ? 'Saving your profile...'
                : `Your caregiver account is ready. ${linkedPWDs.length > 0 ? `You are connected to ${linkedPWDs.map(p => p.name).join(' & ')}.` : 'You can link PWD users from your profile anytime.'}`}
            </Text>
          </View>
        )}

      </ScrollView>

      {step < TOTAL_STEPS && (
        <View style={[styles.navBar, { paddingBottom: insets.bottom + 12 }]}>
          {step > 1 && (
            <TouchableOpacity style={[styles.backBtn, { borderColor: theme.cardBorder }]} onPress={goBack}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.info, flex: step === 1 ? 1 : undefined }]}
            onPress={goNext}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#FFF" />
              : <><Text style={styles.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" /></>}
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
  stepContent: {},
  stepTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  stepDesc: { fontSize: 13, lineHeight: 21, textAlign: 'center', marginBottom: SPACING.lg },
  iconCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  featureList: { gap: SPACING.sm, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  featureText: { fontSize: 14, fontWeight: '600', flex: 1 },
  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 48, fontSize: 14 },
  relChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  relText: { fontWeight: '700', fontSize: 12 },
  linkBox: { padding: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACING.sm },
  linkTitle: { fontWeight: '800', fontSize: 15 },
  linkSub: { fontSize: 12, lineHeight: 18 },
  linkInputRow: { flexDirection: 'row', gap: SPACING.sm },
  linkInput: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 48, fontSize: 16, letterSpacing: 4, fontWeight: '700' },
  linkBtn: { paddingHorizontal: 20, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', height: 48 },
  linkBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  errorText: { fontSize: 12, fontWeight: '600' },
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1 },
  linkedName: { flex: 1, fontWeight: '700' },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm },
  alertIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontWeight: '700', fontSize: 14 },
  alertDesc: { fontSize: 12, marginTop: 2 },
  navBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, flexDirection: 'row', gap: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  backBtnText: { fontWeight: '700', fontSize: 14 },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 14, borderRadius: RADIUS.lg },
  nextBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
