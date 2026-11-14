/**
 * Seevia Safety Hub — Emergency Tab
 * Fall detection, SOS, caregiver call, anomaly monitoring, haptic alerts
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Alert, Switch, DeviceEventEmitter, Linking, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
import { AuthService } from '@/services/firebase/auth.service';
import { UserProfileService } from '@/services/firebase/userProfile.service';
import { fallDetectionService } from '@/services/emergency/fallDetection.service';
import { anomalyDetectionService } from '@/services/emergency/anomalyDetection.service';
import { logger } from '@/utils/logger';

type SOSStatus = 'IDLE' | 'COUNTDOWN' | 'ACTIVE';
type Contact = { id: string; name: string; phone: string; relation: string };

const DEMO_CONTACTS: Contact[] = [
  { id: '1', name: 'Ammi', phone: '+923001234567', relation: 'Mother' },
  { id: '2', name: 'Abu', phone: '+923007654321', relation: 'Father' },
];

export default function EmergencyTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sosStatus, setSOSStatus]       = useState<SOSStatus>('IDLE');
  const [countdown, setCountdown]       = useState(10);
  const [fallEnabled, setFallEnabled]   = useState(true);
  const [hapticOnly, setHapticOnly]     = useState(false);
  const [contacts, setContacts]         = useState<Contact[]>(DEMO_CONTACTS);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const [fallAlertVisible, setFallAlertVisible] = useState(false);
  const [lastFallConf, setLastFallConf] = useState(0);
  const [isDemoContacts, setIsDemoContacts] = useState(true);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fallPulse    = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load real contacts on focus
  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  // SOS pulse
  useEffect(() => {
    if (sosStatus !== 'IDLE') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.10, duration: 380, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sosStatus]);

  // Fall alert pulse
  useEffect(() => {
    if (fallAlertVisible) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(fallPulse, { toValue: 1.04, duration: 500, useNativeDriver: true }),
        Animated.timing(fallPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      fallPulse.setValue(1);
    }
  }, [fallAlertVisible]);

  // Event listeners
  useEffect(() => {
    const sosSub     = DeviceEventEmitter.addListener('VOICE_SOS', () => triggerSOS());
    const caregiverSub = DeviceEventEmitter.addListener('CALL_CAREGIVER', () => callContact(contacts[0]));
    const volunteerSub = DeviceEventEmitter.addListener('CALL_VOLUNTEER', () => router.push('/volunteer-home'));
    const hapticSub  = DeviceEventEmitter.addListener('TOGGLE_HAPTICS', () => {
      setHapticOnly(prev => { const n = !prev; TtsService.speak(n ? 'Haptics mode on.' : 'Haptics mode off.'); return n; });
    });
    const fallSub = DeviceEventEmitter.addListener('FALL_DETECTED', (event: any) => {
      setFallAlertVisible(true);
      setLastFallConf(Math.round((event?.confidence || 0.8) * 100));
      Vibration.vibrate([0, 300, 100, 300]);
      hapticService.trigger('error');
    });
    const fallCancelSub = DeviceEventEmitter.addListener('FALL_CANCELLED', () => {
      setFallAlertVisible(false);
    });

    return () => {
      sosSub.remove(); caregiverSub.remove(); volunteerSub.remove();
      hapticSub.remove(); fallSub.remove(); fallCancelSub.remove();
    };
  }, [contacts]);

  // Toggle fall detection
  useEffect(() => {
    fallDetectionService.setEnabled(fallEnabled);
    anomalyDetectionService.setEnabled(fallEnabled);
  }, [fallEnabled]);

  const loadProfile = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      const profile = await UserProfileService.getUserProfile(user.uid);
      if (!profile) return;

      const loaded: Contact[] = [];
      if (profile.emergencyContactName && profile.emergencyPhone) {
        loaded.push({ id: 'primary', name: profile.emergencyContactName, phone: profile.emergencyPhone, relation: 'Emergency Contact' });
      }
      if (profile.caregiverId) {
        try {
          const cg = await UserProfileService.getUserProfile(profile.caregiverId);
          if (cg) loaded.push({ id: profile.caregiverId, name: cg.fullName || 'Caregiver', phone: (cg as any).phone || '', relation: 'Caregiver' });
        } catch { /* offline */ }
      }

      if (loaded.length > 0) { setContacts(loaded); setIsDemoContacts(false); }
      setUserAllergens(profile.allergies || []);
    } catch {
      logger.warn('EMERGENCY_TAB', 'Using demo contacts');
    }
  };

  const triggerSOS = async () => {
    if (sosStatus !== 'IDLE') return;
    await hapticService.trigger('error');
    Vibration.vibrate([0, 200, 100, 200]);
    TtsService.speak('Emergency! 10 seconds mein contacts ko alert bheja jayega. Cancel karne ke liye SOS dobara dabayein.');
    setSOSStatus('COUNTDOWN');
    setCountdown(10);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); activateSOS(); return 0; }
        hapticService.trigger('light');
        return prev - 1;
      });
    }, 1000);
  };

  const activateSOS = async () => {
    setSOSStatus('ACTIVE');
    await hapticService.trigger('error');
    Vibration.vibrate([0, 500, 200, 500]);
    TtsService.speak('Emergency alert bhej diya! Madad raste mein hai. Shant rahein.');

    contacts.forEach(c => {
      if (c.phone) Linking.openURL(`tel:${c.phone}`).catch(() => {});
    });

    Alert.alert('🚨 SOS Activated', `Emergency alert sent. ${contacts.map(c => c.name).join(', ')} ko notify kiya gaya.`,
      [{ text: 'Cancel SOS', onPress: cancelSOS, style: 'destructive' }]);
  };

  const cancelSOS = async () => {
    clearInterval(countdownRef.current!);
    setSOSStatus('IDLE');
    setCountdown(10);
    await hapticService.trigger('success');
    TtsService.speak('Emergency cancel. Sab theek hai.');
  };

  const callContact = (c?: Contact) => {
    if (!c) { TtsService.speak('Koi emergency contact nahi hai. Settings mein add karein.'); return; }
    TtsService.speak(`${c.name} ko call kar raha hoon.`);
    hapticService.trigger('success');
    if (c.phone) Linking.openURL(`tel:${c.phone}`);
  };

  const dismissFallAlert = () => {
    fallDetectionService.cancelFallResponse();
    setFallAlertVisible(false);
    TtsService.speak('Theek hai. Main yahan hoon.');
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <Text style={[styles.title, { color: theme.text }]}>🛡 Safety Hub</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>AI-powered emergency detection · Fall monitoring</Text>

        {/* FALL ALERT BANNER */}
        {fallAlertVisible && (
          <Animated.View style={[styles.fallBanner, { transform: [{ scale: fallPulse }] }]}>
            <View style={styles.fallBannerTop}>
              <Ionicons name="body" size={28} color="#FFF" />
              <Text style={styles.fallBannerTitle}>GIRNA DETECT HUA</Text>
              <Text style={styles.fallBannerConf}>{lastFallConf}% confident</Text>
            </View>
            <Text style={styles.fallBannerSub}>Kya aap theek hain? 10 seconds mein SOS jayega.</Text>
            <View style={styles.fallBannerBtns}>
              <TouchableOpacity style={styles.fallOkBtn} onPress={dismissFallAlert}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.fallBtnText}>Theek Hoon</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fallOkBtn, { backgroundColor: '#F44336' }]} onPress={() => { dismissFallAlert(); triggerSOS(); }}>
                <Ionicons name="alert-circle" size={20} color="#FFF" />
                <Text style={styles.fallBtnText}>Madad Chahiye</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* SOS Button */}
        <View style={styles.sosWrap}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.sosBtn, { backgroundColor: sosStatus === 'IDLE' ? theme.danger : theme.warning, shadowColor: theme.danger }]}
              onPress={sosStatus === 'IDLE' ? triggerSOS : cancelSOS}
              activeOpacity={0.85}
              accessibilityLabel={sosStatus === 'IDLE' ? 'Trigger SOS emergency' : 'Cancel SOS'}
            >
              <Ionicons name={sosStatus === 'IDLE' ? 'alert-circle' : 'close-circle'} size={64} color="#FFF" />
              <Text style={styles.sosLabel}>
                {sosStatus === 'IDLE' ? 'SOS' : sosStatus === 'COUNTDOWN' ? `${countdown}` : 'ACTIVE'}
              </Text>
              <Text style={styles.sosHint}>
                {sosStatus === 'IDLE' ? 'PRESS FOR EMERGENCY' : sosStatus === 'COUNTDOWN' ? 'Tap to CANCEL' : 'Help coming...'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Status row */}
        <View style={[styles.statusCard, {
          backgroundColor: theme.card,
          borderLeftColor: sosStatus === 'IDLE' ? (fallEnabled ? theme.success : theme.warning) : theme.danger,
          borderLeftWidth: 4,
        }]}>
          <Ionicons name={sosStatus === 'IDLE' ? 'shield-checkmark' : 'warning'} size={20}
            color={sosStatus === 'IDLE' ? (fallEnabled ? theme.success : theme.warning) : theme.danger} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {sosStatus === 'IDLE'
                ? fallEnabled ? 'Active — Fall monitoring on' : 'Standby — Fall monitoring off'
                : sosStatus === 'COUNTDOWN' ? `Alert in ${countdown}s — tap SOS to cancel` : '⚠ Emergency Active'}
            </Text>
            <Text style={[styles.statusSub, { color: theme.textSecondary }]}>
              {sosStatus === 'IDLE' ? '"Madad chahiye" bolein ya SOS dabayein' : 'Emergency contacts notified.'}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.info}15`, borderColor: `${theme.info}44` }]}
            onPress={() => callContact(contacts[0])}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.info}22` }]}>
              <Ionicons name="heart" size={26} color={theme.info} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Caregiver</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>{contacts[0]?.name || 'Not set'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.secondary}15`, borderColor: `${theme.secondary}44` }]}
            onPress={() => router.push('/volunteer-home')}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.secondary}22` }]}>
              <Ionicons name="people" size={26} color={theme.secondary} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Volunteer</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Connect now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}44` }]}
            onPress={() => router.push('/store-navigation')}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${theme.primary}22` }]}>
              <Ionicons name="walk" size={26} color={theme.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: theme.text }]}>Walk Assist</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Obstacle detect</Text>
          </TouchableOpacity>
        </View>

        {/* Detection settings */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Detection Settings</Text>

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: `${theme.primary}22` }]}>
              <Ionicons name="body" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>AI Fall Detection</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>3-phase: free-fall → impact → stillness</Text>
            </View>
            <Switch
              value={fallEnabled}
              onValueChange={v => { setFallEnabled(v); TtsService.speak(v ? 'Fall detection on.' : 'Fall detection off.'); }}
              trackColor={{ true: theme.primary, false: theme.cardBorder }}
              thumbColor="#FFF"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.settingIcon, { backgroundColor: `${theme.secondary}22` }]}>
              <Ionicons name="radio-button-on" size={18} color={theme.secondary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Haptic-Only Mode</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Silent vibration alerts (public places)</Text>
            </View>
            <Switch
              value={hapticOnly}
              onValueChange={v => { setHapticOnly(v); TtsService.speak(v ? 'Haptics only on.' : 'Haptics only off.'); }}
              trackColor={{ true: theme.secondary, false: theme.cardBorder }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Emergency Contacts</Text>
            {isDemoContacts && (
              <View style={[styles.demoBadge, { backgroundColor: `${theme.warning}22` }]}>
                <Text style={{ color: theme.warning, fontSize: 10, fontWeight: '700' }}>DEMO</Text>
              </View>
            )}
          </View>

          {contacts.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.contactRow, { borderBottomWidth: i < contacts.length - 1 ? 1 : 0, borderBottomColor: theme.cardBorder }]}
              onPress={() => callContact(c)}
              accessibilityLabel={`Call ${c.name}`}
            >
              <View style={[styles.contactAvatar, { backgroundColor: `${theme.primary}22` }]}>
                <Ionicons name="person" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>{c.name}</Text>
                <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>{c.relation} · {c.phone || 'No number'}</Text>
              </View>
              <View style={[styles.callBtn, { backgroundColor: `${theme.success}22` }]}>
                <Ionicons name="call" size={18} color={theme.success} />
              </View>
            </TouchableOpacity>
          ))}

          {userAllergens.length > 0 && (
            <View style={[styles.allergenRow, { backgroundColor: `${theme.danger}11` }]}>
              <Ionicons name="warning" size={14} color={theme.danger} />
              <Text style={[styles.settingDesc, { color: theme.danger, marginLeft: 6, flex: 1 }]}>
                ⚠ Allergens: {userAllergens.join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Voice commands */}
        <View style={[styles.voiceCard, { backgroundColor: `${theme.primary}0F`, borderColor: `${theme.primary}30` }]}>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>🎙 Voice Commands</Text>
          {[
            '"Madad chahiye" / "Bachao"  →  SOS trigger',
            '"Theek hoon"  →  Cancel fall alert',
            '"Caretaker ko call karo"  →  Instant call',
            '"Volunteer chahiye"  →  Connect network',
            '"Haptics mode on"  →  Silent alerts',
          ].map((cmd, i) => (
            <Text key={i} style={[styles.voiceCmd, { color: theme.textSecondary }]}>• {cmd}</Text>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.lg },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2, marginBottom: SPACING.lg },

  // Fall banner
  fallBanner: { backgroundColor: '#E53935', borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg },
  fallBannerTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 8 },
  fallBannerTitle: { color: '#FFF', fontWeight: '900', fontSize: 18, flex: 1 },
  fallBannerConf: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  fallBannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginBottom: SPACING.md },
  fallBannerBtns: { flexDirection: 'row', gap: SPACING.sm },
  fallOkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 12, borderRadius: RADIUS.md },
  fallBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // SOS
  sosWrap: { alignItems: 'center', marginBottom: SPACING.lg },
  sosBtn: { width: 210, height: 210, borderRadius: 105, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 20 },
  sosLabel: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 4 },
  sosHint: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', marginTop: 4 },

  // Status
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent', marginBottom: SPACING.md },
  statusTitle: { fontWeight: '700', fontSize: 14 },
  statusSub: { fontSize: 12, marginTop: 2 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  actionCard: { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, gap: SPACING.xs },
  actionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  actionSub: { fontSize: 10, textAlign: 'center' },

  // Card
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.md },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: SPACING.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontWeight: '700', fontSize: 14 },
  settingDesc: { fontSize: 11, marginTop: 2 },

  // Contacts
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  callBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  allergenRow: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.sm, borderRadius: RADIUS.sm, marginTop: SPACING.sm },
  demoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Voice
  voiceCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  voiceCmd: { fontSize: 12, lineHeight: 22 },
});