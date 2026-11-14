/**
 * Seevia Home Dashboard — PWD / Caregiver / Volunteer Aware
 * Demo-ready: voice, haptics, role-based content, AI alerts
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';
import { AuthService } from '@/services/firebase/auth.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { expiryService } from '@/services/pantry/expiry.service';

const SEEVIA_LOGO = require('@/assets/images/SEEVIA-logo.png');

export default function HomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'pwd' | 'caregiver' | 'volunteer'>('pwd');
  const [expiredCount, setExpiredCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Subah Bakhair' : hour < 18 ? 'Adaab' : 'Shab Bakhair';

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('MIC_STATE_CHANGED', ({ listening }) => {
      setIsListening(listening);
      if (listening) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        ).start();
      } else {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      }
    });
    return () => listener.remove();
  }, []);

  const loadUserData = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      const profile = await AuthService.getUserProfile(user.uid);
      
      // 🛠️ DEMO-PROOF FIX: TypeScript is now happy with the 'any' cast!
      const rawName = (profile as any)?.name || profile?.fullName || user?.displayName || 'Dost';
      const firstName = rawName !== 'Dost' ? rawName.split(' ')[0] : 'Dost';
      
      setUserName(firstName);
      setUserRole((profile?.role as any) || 'pwd');

      // Load pantry alerts
      const items = await PantryService.getPantryItems(user.uid);
      const expired = items.filter((i: any) => {
        const info = expiryService.checkExpiryStatus(i);
        return info.isExpired;
      }).length;
      const lowStock = items.filter((i: any) => i.quantity <= (i.lowStockThreshold || 1)).length;

      setExpiredCount(expired);
      setLowStockCount(lowStock);

      // Voice greeting
      const alerts: string[] = [];
      if (expired > 0) alerts.push(`${expired} cheezein expire ho chuki hain`);
      if (lowStock > 0) alerts.push(`${lowStock} cheezein khatam hone wali hain`);

      setTimeout(() => {
        // 🗣️ Speak the personalized first name
        TtsService.speak(`${greeting}, ${firstName}. Seevia ready hai.`);
        if (alerts.length > 0) {
          setTimeout(() => TtsService.speak(alerts.join(' aur ')), 2500);
        }
      }, 500);
    } catch (e) {
      console.warn('[HOME] Error loading user data:', e);
      // Fallback greeting if network fails
      TtsService.speak(`${greeting}, Dost. Seevia ready hai.`);
    }
  };

  const modules = [
    {
      id: 'pantry',
      title: 'Smart Pantry',
      subtitle: 'Inventory, Expiry & Allergens',
      icon: 'nutrition' as const,
      color: '#4CAF50',
      route: '/(tabs)/pantry',
      badge: expiredCount + lowStockCount > 0 ? expiredCount + lowStockCount : undefined,
      badgeColor: expiredCount > 0 ? theme.danger : theme.warning,
    },
    {
      id: 'scanner',
      title: 'Eye Lens',
      subtitle: 'Camera, OCR & Scene Vision',
      icon: 'camera' as const,
      color: '#2196F3',
      route: '/scanner',
    },
    {
      id: 'shopping',
      title: 'Shopping Guide',
      subtitle: 'Lists & Store Navigation',
      icon: 'cart' as const,
      color: '#FF9800',
      route: '/(tabs)/shopping',
    },
    {
      id: 'emergency',
      title: 'Safety Hub',
      subtitle: 'SOS, Fall Detection & Help',
      icon: 'shield-checkmark' as const,
      color: '#F44336',
      route: '/(tabs)/emergency',
    },
    {
      id: 'navigate',
      title: 'Store Nav',
      subtitle: 'Indoor & Outdoor Guidance',
      icon: 'navigate-circle' as const,
      color: '#00BCD4',
      route: '/store-navigation',
    },
  ];

  const QUICK_ACTIONS = [
    {
      id: 'qa_allergen',
      label: 'Allergen\nCheck',
      icon: 'shield-checkmark',
      color: '#9C27B0',
      onPress: async () => {
        await hapticService.trigger('light');
        TtsService.speak('Kaunsa product check karein? Camera se scan karein.');
        router.push('/scanner');
        setTimeout(() => DeviceEventEmitter.emit('TRIGGER_ALLERGEN_SCAN', 'current item'), 800);
      },
    },
    {
      id: 'qa_stock',
      label: 'Low\nStock',
      icon: 'battery-half',
      color: theme.warning,
      onPress: async () => {
        await hapticService.trigger('light');
        DeviceEventEmitter.emit('TRIGGER_LOW_STOCK_CHECK');
        setTimeout(() => router.push('/(tabs)/shopping'), 2500);
      },
    },
    {
      id: 'qa_expiry',
      label: 'Expiry\nCheck',
      icon: 'time',
      color: theme.danger,
      onPress: async () => {
        await hapticService.trigger('light');
        DeviceEventEmitter.emit('TRIGGER_EXPIRY_CHECK');
        setTimeout(() => {
          router.push('/(tabs)/pantry');
          setTimeout(() => DeviceEventEmitter.emit('SHOW_EXPIRED_FILTER'), 500);
        }, 2500);
      },
    },
    {
      id: 'qa_nav',
      label: 'Navigate\nTo Store',
      icon: 'navigate',
      color: '#00BCD4',
      onPress: async () => {
        await hapticService.trigger('light');
        TtsService.speak('Kahan jaana hai? Store navigation khol raha hoon.');
        router.push('/store-navigation');
      },
    },
  ];

  const handleModulePress = async (route: string, title: string) => {
    await hapticService.trigger('light');
    TtsService.speak(`${title} khol raha hoon`);
    router.push(route as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting} 👋</Text>
          <Text style={[styles.name, { color: theme.text }]}>{userName || 'Welcome'}</Text>
          <Text style={[styles.role, { color: theme.primary }]}>
            {userRole === 'pwd' ? 'Visually Impaired User' : userRole === 'caregiver' ? 'Caregiver' : 'Volunteer'}
          </Text>
        </View>
        <Image source={SEEVIA_LOGO} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Alert Bar */}
      {(expiredCount > 0 || lowStockCount > 0) && (
        <TouchableOpacity
          style={[styles.alertBar, { backgroundColor: expiredCount > 0 ? `${theme.danger}22` : `${theme.warning}22`, borderColor: expiredCount > 0 ? theme.danger : theme.warning }]}
          onPress={() => router.push('/(tabs)/pantry')}
        >
          <Ionicons name="warning" size={18} color={expiredCount > 0 ? theme.danger : theme.warning} />
          <Text style={[styles.alertText, { color: expiredCount > 0 ? theme.danger : theme.warning }]}>
            {expiredCount > 0 ? `${expiredCount} expired items — tap to review` : `${lowStockCount} items low on stock`}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={expiredCount > 0 ? theme.danger : theme.warning} />
        </TouchableOpacity>
      )}

      {/* Voice Prompt - 🛠️ DEMO-PROOF FIX: Only show to PWD users to match the FloatingMicFAB logic */}
      {userRole === 'pwd' && (
        <TouchableOpacity
          style={[styles.voiceBar, { backgroundColor: theme.card, borderColor: isListening ? theme.danger : theme.primary }]}
          onPress={() => DeviceEventEmitter.emit('TRIGGER_GLOBAL_MIC')}
        >
          <Animated.View style={[styles.voiceDot, { backgroundColor: isListening ? theme.danger : theme.primary, transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.voiceBarText, { color: isListening ? theme.danger : theme.primary }]}>
            {isListening ? '🎤  Awaaz sun raha hoon...' : '🎤  "Hey Seevia" — Kuch bolein'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickAction, { backgroundColor: `${action.color}18`, borderColor: `${action.color}44` }]}
            onPress={action.onPress}
            accessible
            accessibilityLabel={action.label.replace('\n', ' ')}
            accessibilityRole="button"
          >
            <Ionicons name={action.icon as any} size={24} color={action.color} />
            <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Module Grid */}
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {modules.map((mod) => (
          <TouchableOpacity
            key={mod.id}
            style={[styles.moduleCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => handleModulePress(mod.route, mod.title)}
            activeOpacity={0.75}
          >
            <View style={[styles.moduleIcon, { backgroundColor: `${mod.color}22` }]}>
              <Ionicons name={mod.icon} size={28} color={mod.color} />
              {mod.badge !== undefined && (
                <View style={[styles.badge, { backgroundColor: mod.badgeColor || theme.danger }]}>
                  <Text style={styles.badgeText}>{mod.badge}</Text>
                </View>
              )}
            </View>
            <View style={styles.moduleText}>
              <Text style={[styles.moduleTitle, { color: theme.text }]}>{mod.title}</Text>
              <Text style={[styles.moduleSubtitle, { color: theme.textSecondary }]}>{mod.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: { fontSize: 13, fontWeight: '600' },
  name: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  role: { fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  logo: { width: 56, height: 56, borderRadius: 12 },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600' },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  voiceDot: { width: 10, height: 10, borderRadius: 5 },
  voiceBarText: { fontSize: 15, fontWeight: '700' },
  grid: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 4,
    minHeight: 72,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleText: { flex: 1 },
  moduleTitle: { fontSize: 16, fontWeight: '700' },
  moduleSubtitle: { fontSize: 12, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});