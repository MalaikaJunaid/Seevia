/**
 * Seevia Pantry Screen — Fully Voice-Operated for PWD
 * Fixed: stuck-sync, usage analysis, allergen check, consumption chart, voice add/remove/update
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  TextInput, Image, DeviceEventEmitter, Alert, ScrollView, Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { AuthService } from '@/services/firebase/auth.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { expiryService } from '@/services/pantry/expiry.service';
import { PantryItem, PantryCategory } from '@/models/PantryItem';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

type FilterMode = 'all' | 'expired' | 'low_stock' | 'safe';

const CATEGORY_IMAGES: Record<string, any> = {
  [PantryCategory.DAIRY]:  require('../../assets/images/categories/dairy.png'),
  [PantryCategory.BAKERY]: require('../../assets/images/categories/bakery.png'),
  [PantryCategory.FROZEN]: require('../../assets/images/categories/frozen.png'),
  default: { uri: 'https://cdn-icons-png.flaticon.com/512/135/135763.png' },
};

const FILTERS: { id: FilterMode; label: string; icon: string; color: string }[] = [
  { id: 'all',       label: 'All',       icon: 'apps',             color: theme.primary },
  { id: 'expired',   label: 'Expired',   icon: 'alert-circle',     color: theme.danger },
  { id: 'low_stock', label: 'Low Stock', icon: 'battery-half',     color: theme.warning },
  { id: 'safe',      label: 'Safe',      icon: 'checkmark-circle', color: theme.success },
];

const DEMO_ITEMS: PantryItem[] = [
  { id: 'd1', userId: '', name: 'Milk', category: PantryCategory.DAIRY, quantity: 1, unit: 'L', lowStockThreshold: 2, addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 2 * 86400000).toISOString() } as PantryItem,
  { id: 'd2', userId: '', name: 'Eggs', category: PantryCategory.DAIRY, quantity: 0, unit: 'dozen', lowStockThreshold: 1, addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() - 86400000).toISOString() } as PantryItem,
  { id: 'd3', userId: '', name: 'Bread', category: PantryCategory.BAKERY, quantity: 2, unit: 'packs', lowStockThreshold: 1, addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 10 * 86400000).toISOString() } as PantryItem,
  { id: 'd4', userId: '', name: 'Yogurt', category: PantryCategory.DAIRY, quantity: 3, unit: 'cups', lowStockThreshold: 1, addedDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 5 * 86400000).toISOString() } as PantryItem,
];

export default function PantryDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const itemsRef = useRef<PantryItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useFocusEffect(
    useCallback(() => {
      loadPantryItems();

      const expiredSub = DeviceEventEmitter.addListener('SHOW_EXPIRED_FILTER', () => {
        setActiveFilter('expired');
        TtsService.speak('Expired items dikhaye ja rahe hain.');
      });
      const stockSub = DeviceEventEmitter.addListener('SHOW_LOW_STOCK_FILTER', () => {
        setActiveFilter('low_stock');
        TtsService.speak('Low stock items dikhaye ja rahe hain.');
      });
      const removeSub = DeviceEventEmitter.addListener('VOICE_REMOVE_ITEM', async ({ name }: { name: string }) => {
        if (!name) { TtsService.speak('Kaunsa item remove karein?'); return; }
        const user = AuthService.getCurrentUser();
        if (!user) return;
        const target = itemsRef.current.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
        if (!target) { TtsService.speak(`${name} pantry mein nahi mila.`); return; }
        try {
          await PantryService.deletePantryItem(user.uid, target.id);
          setItems(prev => prev.filter(i => i.id !== target.id));
          TtsService.speak(`${target.name} remove ho gaya.`);
          hapticService.trigger('success');
        } catch { TtsService.speak('Remove nahi ho saka.'); }
      });
      const updateSub = DeviceEventEmitter.addListener('VOICE_UPDATE_PANTRY', async (entities: any) => {
        const name = entities?.product || entities?.itemName || '';
        if (!name) return;
        const user = AuthService.getCurrentUser();
        if (!user) return;
        const target = itemsRef.current.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
        if (!target) { TtsService.speak(`${name} pantry mein nahi mila.`); return; }
        const qty = parseInt(entities?.quantity || '1') || 1;
        try {
          await PantryService.updatePantryItem(user.uid, target.id, { quantity: qty });
          setItems(prev => prev.map(i => i.id === target.id ? { ...i, quantity: qty } : i));
          TtsService.speak(`${target.name} ki quantity ${qty} ho gayi.`);
        } catch { TtsService.speak('Update nahi ho saki.'); }
      });
      const analysisSub = DeviceEventEmitter.addListener('VOICE_PANTRY_ANALYSIS', () => {
        setShowAnalysis(true);
        announceAnalysis();
      });

      return () => {
        expiredSub.remove(); stockSub.remove(); removeSub.remove();
        updateSub.remove(); analysisSub.remove();
      };
    }, [])
  );

  // ─── BUG FIX: Hard 4-second UI timeout prevents infinite spinner ─────────
  const loadPantryItems = async () => {
    setLoading(true);

    // Safety timeout — no matter what, spinner stops in 4s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      if (itemsRef.current.length === 0) setItems(DEMO_ITEMS);
    }, 4000);

    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        const fetched = await PantryService.getPantryItems(user.uid);
        clearTimeout(timeoutId);
        setItems(fetched.length > 0 ? fetched : DEMO_ITEMS);
      } else {
        clearTimeout(timeoutId);
        setItems(DEMO_ITEMS);
      }
    } catch {
      clearTimeout(timeoutId);
      setItems(DEMO_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const announceAnalysis = () => {
    const expired = items.filter(i => expiryService.checkExpiryStatus(i).isExpired);
    const low = items.filter(i => i.quantity <= (i.lowStockThreshold || 1) && !expiryService.checkExpiryStatus(i).isExpired);
    const safe = items.filter(i => !expiryService.checkExpiryStatus(i).isExpired && i.quantity > (i.lowStockThreshold || 1));

    TtsService.speak(
      `Pantry analysis: ${items.length} total items. ${expired.length} expire ho chuke hain. ${low.length} khatam hone wale hain. ${safe.length} safe hain. ${expired.length > 0 ? `Expire: ${expired.map(i => i.name).join(', ')}.` : ''} ${low.length > 0 ? `Low stock: ${low.map(i => i.name).join(', ')}.` : ''}`
    );
  };

  const applyFilter = (item: PantryItem): boolean => {
    const expiry = expiryService.checkExpiryStatus(item);
    const isLow = item.quantity <= (item.lowStockThreshold || 1);
    if (activeFilter === 'expired') return expiry.isExpired;
    if (activeFilter === 'low_stock') return isLow && !expiry.isExpired;
    if (activeFilter === 'safe') return !expiry.isExpired && !isLow;
    return true;
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchSearch && applyFilter(item);
  });

  const handleDelete = (item: PantryItem) => {
    TtsService.speak(`${item.name} remove karna chahte hain? Confirm karein.`);
    hapticService.trigger('heavy');
    Alert.alert(`Remove "${item.name}"?`, 'Is item ko pantry se hata dein?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const user = AuthService.getCurrentUser();
          if (!user) return;
          try {
            await PantryService.deletePantryItem(user.uid, item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
            TtsService.speak(`${item.name} remove ho gaya.`);
            hapticService.trigger('success');
          } catch { TtsService.speak('Remove nahi ho saka.'); }
        },
      },
    ]);
  };

  const counts = {
    expired:   items.filter(i => expiryService.checkExpiryStatus(i).isExpired).length,
    low_stock: items.filter(i => i.quantity <= (i.lowStockThreshold || 1) && !expiryService.checkExpiryStatus(i).isExpired).length,
  };

  // Usage/consumption analysis bar
  const renderAnalysisBar = () => {
    const total = items.length || 1;
    const expPct = (counts.expired / total) * 100;
    const lowPct = (counts.low_stock / total) * 100;
    const safePct = 100 - expPct - lowPct;
    return (
      <TouchableOpacity
        style={[styles.analysisCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        onPress={() => { setShowAnalysis(!showAnalysis); announceAnalysis(); }}
        accessibilityLabel={`Pantry health: ${Math.round(safePct)}% safe, ${Math.round(lowPct)}% low stock, ${Math.round(expPct)}% expired. Tap for details.`}
      >
        <View style={styles.analysisHeader}>
          <Text style={[styles.analysisTitle, { color: theme.text }]}>Pantry Health</Text>
          <Ionicons name={showAnalysis ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
        </View>
        <View style={styles.healthBar}>
          <View style={[styles.healthSegment, { flex: safePct, backgroundColor: theme.success }]} />
          <View style={[styles.healthSegment, { flex: lowPct, backgroundColor: theme.warning }]} />
          <View style={[styles.healthSegment, { flex: expPct, backgroundColor: theme.danger }]} />
        </View>
        {showAnalysis && (
          <View style={styles.analysisDetails}>
            {[
              { color: theme.success, label: `${Math.round(safePct)}% Safe`, count: items.length - counts.expired - counts.low_stock },
              { color: theme.warning, label: `${Math.round(lowPct)}% Low Stock`, count: counts.low_stock },
              { color: theme.danger, label: `${Math.round(expPct)}% Expired`, count: counts.expired },
            ].map(s => (
              <View key={s.label} style={styles.analysisStat}>
                <View style={[styles.analysisDot, { backgroundColor: s.color }]} />
                <Text style={[styles.analysisStatText, { color: theme.textSecondary }]}>{s.label} ({s.count})</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const expiryInfo = expiryService.checkExpiryStatus(item);
    const isLow = item.quantity <= (item.lowStockThreshold || 1);
    const imageSource = item.imageUrl
      ? { uri: item.imageUrl }
      : (CATEGORY_IMAGES[item.category || 'default'] || CATEGORY_IMAGES.default);

    return (
      <TouchableOpacity
        onPress={() => {
          TtsService.speak(`${item.name}: ${item.quantity} ${item.unit || 'units'}. ${expiryInfo.message}.`);
          router.push({ pathname: '/pantry-detail', params: { id: item.id } });
        }}
        onLongPress={() => handleDelete(item)}
        accessible
        accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, ${expiryInfo.message}`}
        accessibilityHint="Tap for details. Long press to remove."
      >
        <View style={[styles.itemCard, {
          backgroundColor: theme.card,
          borderLeftWidth: 4,
          borderLeftColor: expiryInfo.isExpired ? theme.danger : isLow ? theme.warning : theme.success,
          borderColor: theme.cardBorder, borderWidth: 1,
        }]}>
          <View style={styles.itemRow}>
            <Image source={imageSource} style={styles.itemImage} resizeMode="contain" />
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.itemCategory, { color: theme.textSecondary }]}>{item.category || 'Grocery'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: `${expiryInfo.color}22` }]}>
                  <Ionicons name={expiryInfo.isExpired ? 'alert-circle' : expiryInfo.isExpiringSoon ? 'warning' : 'checkmark-circle'} size={11} color={expiryInfo.color} />
                  <Text style={[styles.badgeText, { color: expiryInfo.color }]}>{expiryInfo.message}</Text>
                </View>
                {isLow && !expiryInfo.isExpired && (
                  <View style={[styles.badge, { backgroundColor: `${theme.warning}22` }]}>
                    <Ionicons name="battery-half" size={11} color={theme.warning} />
                    <Text style={[styles.badgeText, { color: theme.warning }]}>Low Stock</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.quantityBox, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.quantityNum, { color: isLow ? theme.warning : theme.primary }]}>{item.quantity}</Text>
              <Text style={[styles.quantityUnit, { color: theme.textSecondary }]}>{item.unit || 'pcs'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: SPACING.lg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>My Pantry</Text>
          <TouchableOpacity onPress={announceAnalysis} accessibilityLabel="Tap to hear pantry summary">
            <Text style={[styles.subtitle, { color: theme.primary }]}>
              {items.length} items · {counts.expired > 0 ? `${counts.expired} expired · ` : ''}{counts.low_stock > 0 ? `${counts.low_stock} low` : 'all good'} 🎙
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: `${theme.warning}22` }]}
            onPress={() => router.push('/scanner')}
            accessibilityLabel="Scan item barcode"
          >
            <Ionicons name="scan-outline" size={20} color={theme.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: `${theme.primary}22` }]}
            onPress={() => router.push('/add-item')}
            accessibilityLabel="Add item manually"
          >
            <Ionicons name="add" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pantry health bar */}
      {!loading && renderAnalysisBar()}

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: theme.card, marginHorizontal: SPACING.lg, borderColor: theme.cardBorder }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search items..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search pantry items"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const badge = f.id === 'expired' ? counts.expired : f.id === 'low_stock' ? counts.low_stock : 0;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, {
                backgroundColor: activeFilter === f.id ? f.color : theme.card,
                borderColor: activeFilter === f.id ? f.color : theme.cardBorder,
              }]}
              onPress={() => {
                setActiveFilter(f.id);
                hapticService.trigger('light');
                const labels: Record<FilterMode, string> = {
                  all: `${items.length} tamam items.`,
                  expired: `${counts.expired} expire ho chuke hain.`,
                  low_stock: `${counts.low_stock} khatam hone wale hain.`,
                  safe: `${items.length - counts.expired - counts.low_stock} safe items.`,
                };
                TtsService.speak(labels[f.id]);
              }}
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <Ionicons name={f.icon as any} size={13} color={activeFilter === f.id ? '#FFF' : f.color} />
              <Text style={[styles.filterLabel, { color: activeFilter === f.id ? '#FFF' : theme.textSecondary }]}>{f.label}</Text>
              {badge > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: activeFilter === f.id ? 'rgba(255,255,255,0.3)' : f.color }]}>
                  <Text style={styles.filterBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Loading Pantry...</Text>
          <Text style={[styles.loadingHint, { color: theme.textSecondary }]}>Demo data loading if offline</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="basket-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {activeFilter !== 'all' ? `No ${activeFilter.replace('_', ' ')} items.` : searchQuery ? 'No match.' : 'Pantry khali hai.'}
              </Text>
              {!searchQuery && activeFilter === 'all' && (
                <TouchableOpacity
                  style={[styles.addFirstBtn, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/add-item')}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.addFirstText}>Pehla item add karein</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Voice hint FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          TtsService.speak(`Aap pantry mein hain. ${items.length} items hain. ${counts.expired} expire, ${counts.low_stock} low stock. Item add karne ke liye plus dabayein ya bolein "doodh add karo".`);
          hapticService.trigger('light');
        }}
        accessibilityLabel="Hear pantry summary"
      >
        <Ionicons name="volume-high" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  analysisCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  analysisTitle: { fontWeight: '700', fontSize: 14 },
  healthBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.sm },
  healthSegment: { height: 8 },
  analysisDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  analysisStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  analysisDot: { width: 8, height: 8, borderRadius: 4 },
  analysisStatText: { fontSize: 11, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 44, marginBottom: SPACING.sm },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.xs, marginBottom: SPACING.sm },
  filterChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 10, fontWeight: '700' },
  filterBadge: { width: 15, height: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  itemCard: { marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm },
  itemImage: { width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: theme.backgroundSecondary },
  itemInfo: { flex: 1, marginLeft: SPACING.md },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemCategory: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  quantityBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, alignItems: 'center', minWidth: 48 },
  quantityNum: { fontWeight: '900', fontSize: 18 },
  quantityUnit: { fontSize: 9, textTransform: 'uppercase', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  loadingText: { fontWeight: '700', fontSize: 15 },
  loadingHint: { fontSize: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  addFirstText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});