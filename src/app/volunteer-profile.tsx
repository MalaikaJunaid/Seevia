/**
 * Seevia Volunteer Profile
 * Dark-themed, interactive: stats, feedback list, map verification, edit, sign out
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';

const DEMO_FEEDBACK = [
  { id: '1', from: 'Ali K.', stars: 5, text: 'Bahut helpful tha. Mujhe store mein rasta dikhaya. Allah bhala kare.', date: '2 days ago', type: 'guidance' },
  { id: '2', from: 'Sara M.', stars: 5, text: 'Very patient and kind. Helped me identify products at the pharmacy.', date: '5 days ago', type: 'assistance' },
  { id: '3', from: 'Hania R.', stars: 4, text: 'Navigation me thori delay thi but overall bohat acha experience raha.', date: '1 week ago', type: 'navigation' },
];

const DEMO_MAPS = [
  { id: 'm1', store: 'Giga Mall Grocery', nodes: 12, lastUpdated: '3 days ago', verified: false },
  { id: 'm2', store: 'Carrefour F-10', nodes: 22, lastUpdated: '1 week ago', verified: true },
];

export default function VolunteerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'maps'>('overview');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) { setLoading(false); return; }
      const p = await FirestoreService.getDocument('users', user.uid);
      setProfile(p || {
        fullName: 'Volunteer', phone: '', city: 'Islamabad',
        casesResolved: 12, rating: 4.7, reviewCount: 9,
        skills: ['Navigation Help', 'Shopping Assistance'],
        availableAllDay: false, availFrom: '09:00', availTo: '18:00',
      });
    } catch { setProfile({ fullName: 'Volunteer', casesResolved: 12, rating: 4.7, reviewCount: 9 }); }
    finally { setLoading(false); }
  };

  const signOut = () => {
    Alert.alert('Sign Out', 'Kya aap sign out karna chahte hain?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await AuthService.signOut(); router.replace('/'); } },
    ]);
  };

  const verifyMap = (mapId: string, storeName: string) => {
    Alert.alert(
      `Verify: ${storeName}`,
      'Kya aap ne is store ka map khud check kiya aur confirm karte hain ke yeh accurate hai?',
      [
        { text: 'Not Yet', style: 'cancel' },
        { text: '✅ Verify', onPress: () => {
          hapticService.trigger('success');
          Alert.alert('Verified!', `${storeName} map verified ho gaya. Shukriya!`);
        }},
      ]
    );
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.success} />
    </View>
  );

  const fullName = profile?.fullName || 'Volunteer';
  const casesResolved = profile?.casesResolved || 0;
  const rating = profile?.rating || 0;
  const stars = Math.round(rating);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: 'person' },
    { id: 'feedback', label: 'Feedback', icon: 'chatbubbles' },
    { id: 'maps', label: 'Maps', icon: 'map' },
  ] as const;

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <View style={[styles.avatar, { backgroundColor: `${theme.success}22` }]}>
            <Ionicons name="person" size={36} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={14} color="#FFD700" />
              ))}
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{rating.toFixed(1)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.availBadge, { backgroundColor: isAvailable ? `${theme.success}22` : `${theme.danger}22`, borderColor: isAvailable ? theme.success : theme.danger }]}
            onPress={() => { setIsAvailable(v => !v); hapticService.trigger('light'); }}
          >
            <View style={[styles.dot, { backgroundColor: isAvailable ? theme.success : theme.danger }]} />
            <Text style={[{ fontSize: 11, fontWeight: '700' }, { color: isAvailable ? theme.success : theme.danger }]}>
              {isAvailable ? 'Available' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Cases Resolved', value: String(casesResolved), icon: 'checkmark-circle', color: theme.success },
            { label: 'Avg Rating', value: rating.toFixed(1) + '★', icon: 'star', color: '#FFD700' },
            { label: 'Reviews', value: String(profile?.reviewCount || 0), icon: 'chatbubble', color: theme.primary },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && { borderBottomWidth: 2, borderBottomColor: theme.success }]}
            onPress={() => { setActiveTab(t.id); hapticService.trigger('light'); }}
          >
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.id ? theme.success : theme.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === t.id ? theme.success : theme.textSecondary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={{ gap: SPACING.md }}>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Personal Info</Text>
              {[
                { icon: 'call', label: 'Phone', value: profile?.phone || 'Not set' },
                { icon: 'location', label: 'City', value: profile?.city || 'Not set' },
                { icon: 'time', label: 'Availability', value: profile?.availableAllDay ? '24 Hours' : `${profile?.availFrom || '?'} – ${profile?.availTo || '?'}` },
              ].map(r => (
                <View key={r.label} style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
                  <Ionicons name={r.icon as any} size={16} color={theme.success} />
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{r.value}</Text>
                </View>
              ))}
            </View>

            {profile?.skills?.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Skills</Text>
                <View style={styles.skillsWrap}>
                  {profile.skills.map((s: string) => (
                    <View key={s} style={[styles.skillChip, { backgroundColor: `${theme.success}18`, borderColor: `${theme.success}44` }]}>
                      <Text style={[styles.skillText, { color: theme.success }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Edit + Sign Out */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${theme.primary}18`, borderColor: theme.primary }]} onPress={() => router.push('/onboarding-volunteer' as any)}>
              <Ionicons name="create-outline" size={18} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${theme.danger}18`, borderColor: theme.danger }]} onPress={signOut}>
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.actionBtnText, { color: theme.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <View style={{ gap: SPACING.md }}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>PWD Feedback ({DEMO_FEEDBACK.length})</Text>
            {DEMO_FEEDBACK.map(fb => (
              <View key={fb.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.feedbackHeader}>
                  <View style={[styles.feedbackAvatar, { backgroundColor: `${theme.primary}22` }]}>
                    <Ionicons name="person" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feedbackFrom, { color: theme.text }]}>{fb.from}</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Ionicons key={i} name={i < fb.stars ? 'star' : 'star-outline'} size={12} color="#FFD700" />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.feedbackDate, { color: theme.textTertiary }]}>{fb.date}</Text>
                </View>
                <Text style={[styles.feedbackText, { color: theme.textSecondary }]}>"{fb.text}"</Text>
                <View style={[styles.feedbackType, { backgroundColor: `${theme.info}18` }]}>
                  <Text style={[{ fontSize: 10, fontWeight: '700', color: theme.info }]}>📋 {fb.type.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Maps Tab */}
        {activeTab === 'maps' && (
          <View style={{ gap: SPACING.md }}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>Indoor Maps to Verify</Text>
            <View style={[styles.infoBox, { backgroundColor: `${theme.info}10`, borderColor: `${theme.info}33` }]}>
              <Ionicons name="information-circle" size={16} color={theme.info} />
              <Text style={[styles.infoBoxText, { color: theme.textSecondary }]}>
                Visit these stores and verify that the indoor maps are accurate. Your verification helps PWD users navigate safely.
              </Text>
            </View>
            {DEMO_MAPS.map(m => (
              <View key={m.id} style={[styles.card, { backgroundColor: theme.card, borderColor: m.verified ? theme.success : theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                  <View style={[styles.mapIcon, { backgroundColor: `${theme.success}20` }]}>
                    <Ionicons name="map" size={22} color={theme.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontWeight: '700', fontSize: 14 }, { color: theme.text }]}>{m.store}</Text>
                    <Text style={[{ fontSize: 11 }, { color: theme.textSecondary }]}>{m.nodes} nodes · Updated {m.lastUpdated}</Text>
                  </View>
                  {m.verified
                    ? <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                    : <TouchableOpacity
                        style={[styles.verifyBtn, { backgroundColor: theme.success }]}
                        onPress={() => verifyMap(m.id, m.store)}
                      >
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      </TouchableOpacity>
                  }
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${theme.success}18`, borderColor: theme.success }]}
              onPress={() => router.push('/volunteer-mapping' as any)}
            >
              <Ionicons name="add-circle" size={18} color={theme.success} />
              <Text style={[styles.actionBtnText, { color: theme.success }]}>Map a New Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { padding: SPACING.lg, borderBottomWidth: 1, gap: SPACING.md },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontWeight: '800', fontSize: 15 },
  statLabel: { fontSize: 10, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '700' },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  cardTitle: { fontWeight: '800', fontSize: 14, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  infoLabel: { flex: 1, fontSize: 13 },
  infoValue: { fontWeight: '700', fontSize: 13 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  skillChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  skillText: { fontSize: 12, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  actionBtnText: { fontWeight: '800', fontSize: 15 },
  sectionHeader: { fontSize: 16, fontWeight: '800', marginBottom: SPACING.sm },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  feedbackAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  feedbackFrom: { fontWeight: '700', fontSize: 13 },
  feedbackDate: { fontSize: 11 },
  feedbackText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginBottom: SPACING.sm },
  feedbackType: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  infoBoxText: { flex: 1, fontSize: 12, lineHeight: 18 },
  mapIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  verifyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
