/**
 * Seevia Volunteer Home Screen — Redesigned with DARK_THEME
 * Demo: shows nearby help cases, accept/respond flow
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
import { volunteerService, HelpCase } from '@/services/volunteer.service';
import { useAuth } from '@/hooks/useAuth';

const URGENCY_CONFIG = {
  critical: { color: '#F44336', label: 'CRITICAL', bg: '#F4433620' },
  high:     { color: '#FF9800', label: 'HIGH',     bg: '#FF980020' },
  medium:   { color: '#FFC107', label: 'MEDIUM',   bg: '#FFC10720' },
  low:      { color: '#4CAF50', label: 'LOW',      bg: '#4CAF5020' },
};

const CASE_TYPE_ICON: Record<string, string> = {
  emergency:  'alert-circle',
  assistance: 'navigate',
  guidance:   'document-text',
};

export default function VolunteerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [cases, setCases] = useState<HelpCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingCaseId, setAcceptingCaseId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadCases();
      TtsService.speak('Volunteer Dashboard. Nearby help requests load ho rahe hain.');
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadCases, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      // Try real service, fall back to demo data
      try {
        const realCases = await volunteerService.getNearbyHelpRequests?.(user?.uid || '');
        if (realCases && realCases.length > 0) {
          setCases(realCases);
          setLoading(false);
          return;
        }
      } catch { /* fall through to demo */ }

      // Demo cases
      setCases([
        {
          id: 'demo_1',
          userId: 'user_demo',
          userLocation: { latitude: 33.7295, longitude: 73.0931 },
          caseType: 'guidance',
          urgency: 'high',
          description: 'Visually impaired user needs help navigating from Jinnah Super to nearest pharmacy.',
          status: 'active',
          acceptanceDeadline: Date.now() + 8 * 60 * 1000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          nearbyVolunteers: [{ volunteerId: 'v1', distance: 1.2 }],
        },
        {
          id: 'demo_2',
          userId: 'user_demo2',
          userLocation: { latitude: 33.7215, longitude: 73.0431 },
          caseType: 'assistance',
          urgency: 'medium',
          description: 'User needs help reading product labels at Giga Mall grocery section.',
          status: 'active',
          acceptanceDeadline: Date.now() + 15 * 60 * 1000,
          createdAt: Date.now() - 5 * 60 * 1000,
          updatedAt: Date.now(),
          nearbyVolunteers: [{ volunteerId: 'v1', distance: 3.5 }],
        },
      ]);
    } catch (e) {
      console.warn('[VOLUNTEER] Error loading cases:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCases();
    setRefreshing(false);
  };

  const handleAccept = async (caseId: string) => {
    setAcceptingCaseId(caseId);
    await hapticService.trigger('success');
    try {
      TtsService.speak('Case accept kar raha hoon. Aapka connection ho raha hai...');
      await volunteerService.acceptCase(user?.uid || '', caseId);
      TtsService.speak('Case accepted! User se connect ho gaye.');
      setCases(prev => prev.filter(c => c.id !== caseId));
    } catch {
      TtsService.speak('Case accept karne mein masla aya. Dobara try karein.');
    } finally {
      setAcceptingCaseId(null);
    }
  };

  const formatTimeLeft = (deadline: number) => {
    const ms = deadline - Date.now();
    if (ms <= 0) return 'Expired';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s left`;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Volunteer Hub</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {cases.length} active request{cases.length !== 1 ? 's' : ''} nearby
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.availBadge, { backgroundColor: isAvailable ? `${theme.success}22` : `${theme.danger}22`, borderColor: isAvailable ? theme.success : theme.danger }]}
          onPress={() => {
            setIsAvailable(prev => {
              const next = !prev;
              TtsService.speak(next ? 'Aap available hain.' : 'Aap unavailable hain.');
              return next;
            });
          }}
        >
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? theme.success : theme.danger }]} />
          <Text style={[styles.availText, { color: isAvailable ? theme.success : theme.danger }]}>
            {isAvailable ? 'Available' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {[
          { label: 'Today', value: '3', icon: 'checkmark-circle', color: theme.success },
          { label: 'Active', value: String(cases.length), icon: 'radio-button-on', color: theme.primary },
          { label: 'Rating', value: '4.8★', icon: 'star', color: '#FFD700' },
        ].map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Cases */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Nearby cases load ho rahe hain...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {cases.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Abhi koi help request nahi hai.{'\n'}Pull down to refresh.
              </Text>
            </View>
          ) : (
            cases.map(c => {
              const urgCfg = URGENCY_CONFIG[c.urgency as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.medium;
              const minsLeft = Math.round((c.acceptanceDeadline - Date.now()) / 60000);
              return (
                <View key={c.id} style={[styles.caseCard, { backgroundColor: theme.card, borderColor: urgCfg.color }]}>
                  {/* Case header */}
                  <View style={styles.caseHeader}>
                    <View style={[styles.caseTypeIcon, { backgroundColor: urgCfg.bg }]}>
                      <Ionicons name={(CASE_TYPE_ICON[c.caseType] || 'help-circle') as any} size={22} color={urgCfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                      <Text style={[styles.caseType, { color: theme.text }]}>
                        {c.caseType.charAt(0).toUpperCase() + c.caseType.slice(1)} Help
                      </Text>
                      <Text style={[styles.caseTime, { color: theme.textSecondary }]}>
                        {minsLeft <= 0 ? '⚠ Deadline passed' : `⏱ ${minsLeft}m to accept`}
                      </Text>
                    </View>
                    <View style={[styles.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.color }]}>
                      <Text style={[styles.urgText, { color: urgCfg.color }]}>{urgCfg.label}</Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={[styles.caseDesc, { color: theme.textSecondary }]}>{c.description}</Text>

                  {/* Distance + Accept */}
                  <View style={styles.caseFooter}>
                    <View style={styles.caseInfo}>
                      <Ionicons name="location" size={14} color={theme.textTertiary} />
                      <Text style={[styles.infoText, { color: theme.textTertiary }]}>
                        {(c.nearbyVolunteers?.[0]?.distance || 0).toFixed(1)} km away
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: theme.success }]}
                      onPress={() => handleAccept(c.id)}
                      disabled={acceptingCaseId === c.id}
                    >
                      {acceptingCaseId === c.id
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontWeight: '700', fontSize: 12 },
  statsRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: SPACING.md },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontWeight: '800', fontSize: 16 },
  statLabel: { fontSize: 11 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: SPACING.sm, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: SPACING.md, fontSize: 15, lineHeight: 22 },
  list: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  caseCard: { borderRadius: RADIUS.lg, borderLeftWidth: 4, padding: SPACING.md },
  caseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  caseTypeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  caseType: { fontWeight: '700', fontSize: 15 },
  caseTime: { fontSize: 12, marginTop: 2 },
  urgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  urgText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  caseDesc: { fontSize: 13, lineHeight: 18, marginBottom: SPACING.sm, padding: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 },
  caseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
