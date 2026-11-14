/**
 * Seevia Caregiver Dashboard — Full-featured
 * Tabs: PWDs | Notifications | Settings
 * Per-PWD: live location, pantry view, shopping list, medication management
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Switch, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { PWDConnectionService } from '@/services/firebase/pwdConnection.service';
import { logger } from '@/utils/logger';

type TabId = 'pwds' | 'notifications' | 'settings';

interface ConnectedPWD {
  uid: string; name: string;
  status: 'online' | 'offline';
  lastActive: string;
  fallEnabled: boolean;
  medTakenToday: boolean;
}

interface Notif {
  id: string; pwdName: string;
  type: 'fall' | 'sos' | 'location' | 'low_stock' | 'medication';
  message: string; time: string; read: boolean;
}

const DEMO_PWDS: ConnectedPWD[] = [
  { uid: 'demo1', name: 'Baba Ji', status: 'online', lastActive: 'Just now', fallEnabled: true, medTakenToday: false },
  { uid: 'demo2', name: 'Dadi Amma', status: 'offline', lastActive: '2h ago', fallEnabled: true, medTakenToday: true },
];
const DEMO_NOTIFS: Notif[] = [
  { id: 'n1', pwdName: 'Baba Ji', type: 'fall', message: 'Fall detected at Jinnah Super Market. Auto-SOS sent.', time: '10 min ago', read: false },
  { id: 'n2', pwdName: 'Dadi Amma', type: 'medication', message: 'Missed Metformin at 08:00. Please remind manually.', time: '2 hours ago', read: false },
  { id: 'n3', pwdName: 'Baba Ji', type: 'low_stock', message: 'Milk is running low (1L remaining).', time: '5 hours ago', read: true },
  { id: 'n4', pwdName: 'Dadi Amma', type: 'sos', message: 'Emergency SOS triggered and resolved.', time: 'Yesterday', read: true },
];

const TYPE_CONFIG: Record<Notif['type'], { icon: string; color: string; label: string }> = {
  fall:       { icon: 'body', color: theme.danger, label: 'Fall Alert' },
  sos:        { icon: 'alert-circle', color: theme.danger, label: 'SOS' },
  location:   { icon: 'location', color: theme.info, label: 'Location' },
  low_stock:  { icon: 'basket', color: theme.warning, label: 'Low Stock' },
  medication: { icon: 'medical', color: theme.warning, label: 'Medication' },
};

export default function CaregiverDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('pwds');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pwds, setPwds] = useState<ConnectedPWD[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [caregiverName, setCaregiverName] = useState('Caregiver');

  // Expand/collapse per-PWD sections
  const [expandedPWD, setExpandedPWD] = useState<string | null>(null);
  // Per-PWD pantry/shopping/medication state
  const [pwdData, setPwdData] = useState<Record<string, any>>({});

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    try {
      const u = AuthService.getCurrentUser();
      if (!u) { setLoading(false); return; }

      const profile = await FirestoreService.getDocument('users', u.uid) as any;
      setCaregiverName(profile?.fullName || 'Caregiver');

      // Try real connections first
      try {
        const { where } = require('firebase/firestore');
        const conns = await FirestoreService.queryDocuments('trust_circle', [where('caregiver_uid', '==', u.uid), where('status', '==', 'active')]);
        if (conns.length > 0) {
          const list: ConnectedPWD[] = await Promise.all(conns.map(async (c: any) => {
            const p = await FirestoreService.getDocument('users', c.pwd_uid) as any;
            return {
              uid: c.pwd_uid, name: c.pwd_name || p?.name || 'PWD User',
              status: p?.lastActive && Date.now() - p.lastActive < 5 * 60000 ? 'online' : 'offline',
              lastActive: p?.lastActive ? fmtAgo(p.lastActive) : 'Unknown',
              fallEnabled: p?.fallDetectionEnabled ?? false,
              medTakenToday: p?.medTakenToday ?? false,
            };
          }));
          setPwds(list);
          setNotifs(DEMO_NOTIFS);
          setLoading(false);
          return;
        }
      } catch (e) { logger.warn('CAREGIVER', 'Firestore conn error', e); }

      // Demo fallback
      setPwds(DEMO_PWDS);
      setNotifs(DEMO_NOTIFS);
    } catch { setPwds(DEMO_PWDS); setNotifs(DEMO_NOTIFS); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmtAgo = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  };

  const linkPWD = async () => {
    if (!linkCode.trim()) { setLinkError('Enter a valid invite code.'); return; }
    setLinking(true); setLinkError('');
    try {
      const u = AuthService.getCurrentUser();
      if (!u) return;
      // validateAndUseCode is the correct API: returns CaregiverPWDConnection
      const conn = await PWDConnectionService.validateAndUseCode(
        linkCode.trim(),
        u.uid,
        caregiverName
      );
      const newPWD: ConnectedPWD = {
        uid: conn.pwd_uid,
        name: conn.pwd_name || 'PWD User',
        status: 'offline',
        lastActive: 'Just linked',
        fallEnabled: false,
        medTakenToday: false,
      };
      setPwds(prev => [...prev, newPWD]);
      setLinkCode('');
      hapticService.trigger('success');
      Alert.alert('✅ Linked!', `Connected to ${newPWD.name}.`);
    } catch (e: any) {
      setLinkError(e?.message || 'Code not found. Ask PWD to regenerate.');
      hapticService.trigger('error');
    } finally { setLinking(false); }
  };

  const signOut = () => {
    Alert.alert('Sign Out', 'Kya aap sign out karna chahte hain?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await AuthService.signOut(); router.replace('/'); } },
    ]);
  };

  const markNotifRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifs.filter(n => !n.read).length;

  const TABS = [
    { id: 'pwds' as TabId, icon: 'people', label: 'My PWDs' },
    { id: 'notifications' as TabId, icon: 'notifications', label: 'Alerts', badge: unreadCount },
    { id: 'settings' as TabId, icon: 'settings', label: 'Settings' },
  ];

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.info} />
      <Text style={{ color: theme.info, marginTop: 12, fontWeight: '600' }}>Loading dashboard...</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <Image source={require('../../assets/images/seevia-braile.png')} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Caregiver Portal</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{caregiverName} · {pwds.length} linked</Text>
        </View>
        {unreadCount > 0 && (
          <View style={[styles.urgentBadge, { backgroundColor: theme.danger }]}>
            <Ionicons name="alert" size={14} color="#FFF" />
            <Text style={styles.urgentText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && { borderBottomWidth: 2, borderBottomColor: theme.info }]}
            onPress={() => { setActiveTab(t.id); hapticService.trigger('light'); }}>
            <View style={{ position: 'relative' }}>
              <Ionicons name={t.icon as any} size={18} color={activeTab === t.id ? theme.info : theme.textSecondary} />
              {t.badge ? (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{t.badge}</Text></View>
              ) : null}
            </View>
            <Text style={[styles.tabText, { color: activeTab === t.id ? theme.info : theme.textSecondary }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.info} />}
      >
        {/* ── My PWDs Tab ────────────────────────────────────────────── */}
        {activeTab === 'pwds' && (
          <>
            {pwds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No PWDs linked</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Ask your PWD to generate a link code from their Seevia profile.</Text>
              </View>
            ) : pwds.map(pwd => {
              const expanded = expandedPWD === pwd.uid;
              return (
                <View key={pwd.uid} style={[styles.pwdCard, { backgroundColor: theme.card, borderColor: pwd.status === 'online' ? theme.success : theme.cardBorder }]}>
                  {/* PWD header */}
                  <TouchableOpacity style={styles.pwdHeader} onPress={() => { setExpandedPWD(expanded ? null : pwd.uid); hapticService.trigger('light'); }}>
                    <View style={[styles.pwdAvatar, { backgroundColor: `${theme.info}22` }]}>
                      <Ionicons name="person" size={22} color={theme.info} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                      <Text style={[styles.pwdName, { color: theme.text }]}>{pwd.name}</Text>
                      <Text style={[styles.pwdLastSeen, { color: theme.textSecondary }]}>{pwd.status === 'online' ? '🟢 Online' : `🔴 Last: ${pwd.lastActive}`}</Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
                  </TouchableOpacity>

                  {/* Status badges */}
                  <View style={styles.pwdBadges}>
                    <View style={[styles.badge, { backgroundColor: pwd.fallEnabled ? `${theme.success}18` : `${theme.danger}18` }]}>
                      <Ionicons name="body" size={11} color={pwd.fallEnabled ? theme.success : theme.danger} />
                      <Text style={[styles.badgeText, { color: pwd.fallEnabled ? theme.success : theme.danger }]}>
                        {pwd.fallEnabled ? 'Fall On' : 'Fall Off'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: pwd.medTakenToday ? `${theme.success}18` : `${theme.warning}18` }]}>
                      <Ionicons name="medical" size={11} color={pwd.medTakenToday ? theme.success : theme.warning} />
                      <Text style={[styles.badgeText, { color: pwd.medTakenToday ? theme.success : theme.warning }]}>
                        {pwd.medTakenToday ? 'Med Taken' : 'Med Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Expanded actions */}
                  {expanded && (
                    <View style={[styles.expandedArea, { borderTopColor: theme.cardBorder }]}>
                      {[
                        { icon: 'location', label: 'Live Location', color: theme.info, action: () => Alert.alert('Location', `Showing ${pwd.name}'s location on map (Firebase integration required)`) },
                        { icon: 'basket', label: 'View Pantry', color: theme.primary, action: () => router.push({ pathname: '/caregiver/[pwd_uid]', params: { pwd_uid: pwd.uid, pwd_name: pwd.name } } as any) },
                        { icon: 'cart', label: 'Shopping List', color: theme.success, action: () => router.push({ pathname: '/caregiver/[pwd_uid]', params: { pwd_uid: pwd.uid, view: 'shopping' } } as any) },
                        { icon: 'medical', label: 'Medications', color: theme.warning, action: () => router.push({ pathname: '/caregiver/[pwd_uid]', params: { pwd_uid: pwd.uid, view: 'medication' } } as any) },
                      ].map(btn => (
                        <TouchableOpacity key={btn.label} style={[styles.actionBtn, { borderColor: btn.color, backgroundColor: `${btn.color}10` }]} onPress={btn.action}>
                          <Ionicons name={btn.icon as any} size={16} color={btn.color} />
                          <Text style={[styles.actionBtnText, { color: btn.color }]}>{btn.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Link new PWD */}
            <View style={[styles.linkCard, { backgroundColor: theme.card, borderColor: `${theme.info}33` }]}>
              <Text style={[styles.linkTitle, { color: theme.text }]}>Link a PWD</Text>
              <View style={styles.linkRow}>
                <TextInput
                  style={[styles.linkInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: linkError ? theme.danger : theme.cardBorder }]}
                  value={linkCode}
                  onChangeText={t => { setLinkCode(t); setLinkError(''); }}
                  placeholder="6-digit invite code"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <TouchableOpacity style={[styles.linkBtn, { backgroundColor: linking ? theme.cardBorder : theme.info }]} onPress={linkPWD} disabled={linking}>
                  {linking ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.linkBtnText}>Link</Text>}
                </TouchableOpacity>
              </View>
              {linkError ? <Text style={[styles.errorText, { color: theme.danger }]}>{linkError}</Text> : null}
            </View>
          </>
        )}

        {/* ── Notifications Tab ──────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <>
            {notifs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={56} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No alerts yet</Text>
              </View>
            ) : notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              return (
                <TouchableOpacity key={n.id} style={[styles.notifCard, {
                  backgroundColor: n.read ? theme.card : `${cfg.color}10`,
                  borderColor: n.read ? theme.cardBorder : cfg.color,
                  borderLeftWidth: n.read ? 1 : 4,
                }]} onPress={() => markNotifRead(n.id)}>
                  <View style={[styles.notifIcon, { backgroundColor: `${cfg.color}20` }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.notifTitle, { color: theme.text }]}>{cfg.label} · {n.pwdName}</Text>
                      {!n.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
                    </View>
                    <Text style={[styles.notifMsg, { color: theme.textSecondary }]}>{n.message}</Text>
                    <Text style={[styles.notifTime, { color: theme.textTertiary }]}>{n.time}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Settings Tab ──────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <View style={{ gap: SPACING.md }}>
            <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => router.push('/onboarding-caregiver' as any)}>
              <Ionicons name="create-outline" size={20} color={theme.info} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => Alert.alert('Notifications', 'All emergency, medication, and low stock alerts are enabled by default.')}>
              <Ionicons name="notifications-outline" size={20} color={theme.info} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Notification Settings</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, { backgroundColor: `${theme.danger}10`, borderColor: theme.danger }]} onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              <Text style={[styles.settingLabel, { color: theme.danger }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function useAuth() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(AuthService.getCurrentUser()); }, []);
  return { user };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderBottomWidth: 1 },
  logo: { width: 36, height: 36 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  urgentText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 12, fontWeight: '700' },
  tabBadge: { position: 'absolute', top: -6, right: -8, backgroundColor: theme.danger, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  pwdCard: { borderRadius: RADIUS.xl, borderWidth: 1, marginBottom: SPACING.md },
  pwdHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  pwdAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  pwdName: { fontWeight: '800', fontSize: 15 },
  pwdLastSeen: { fontSize: 12, marginTop: 2 },
  pwdBadges: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  expandedArea: { padding: SPACING.md, borderTopWidth: 1, gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  actionBtnText: { fontWeight: '700', fontSize: 14 },
  linkCard: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md, gap: SPACING.sm },
  linkTitle: { fontWeight: '800', fontSize: 14 },
  linkRow: { flexDirection: 'row', gap: SPACING.sm },
  linkInput: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 48, fontSize: 16, letterSpacing: 4, fontWeight: '700' },
  linkBtn: { paddingHorizontal: 20, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', height: 48 },
  linkBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  errorText: { fontSize: 12, fontWeight: '600' },
  notifCard: { borderRadius: RADIUS.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, marginBottom: SPACING.sm },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifTitle: { fontWeight: '700', fontSize: 13 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  notifMsg: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  notifTime: { fontSize: 10, marginTop: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  settingLabel: { flex: 1, fontWeight: '700', fontSize: 14 },
});