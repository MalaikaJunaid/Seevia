/**
 * Seevia Indoor Mapper Screen
 * Records store layout via dead reckoning + Gemini Vision labels.
 * Renders a live node-graph map. Saves to Firebase for all users.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, DeviceEventEmitter, Modal, ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { storeMapperService, MapNode } from '@/services/indoor/storeMapper.service';
import { AuthService } from '@/services/firebase/auth.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const SECTION_PRESETS = [
  'Entrance', 'Dairy', 'Bakery', 'Frozen Foods', 'Beverages',
  'Snacks', 'Meat', 'Vegetables', 'Fruits', 'Cleaning',
  'Personal Care', 'Checkout', 'Pharmacy', 'Electronics',
];

export default function IndoorMapperScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);

  const [isMapping, setIsMapping]     = useState(false);
  const [storeName, setStoreName]     = useState('');
  const [city, setCity]               = useState('Islamabad');
  const [storeId, setStoreId]         = useState('');
  const [nodes, setNodes]             = useState<MapNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState('');
  const [stepCount, setStepCount]     = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const [scanning, setScanning]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [hasCam, setHasCam]           = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(r => setHasCam(r.status === 'granted'));

    const stepSub  = DeviceEventEmitter.addListener('MAPPER_STEP', d => {
      setStepCount(d.stepCount);
    });
    const nodeSub  = DeviceEventEmitter.addListener('MAPPER_NEW_NODE', d => {
      setNodes(storeMapperService.getNodes());
      setCurrentNodeId(d.node.id);
      hapticService.trigger('light');
      // Auto-scan via Gemini every new node
      autoScanNode();
    });
    const labelSub = DeviceEventEmitter.addListener('MAPPER_NODE_LABELED', d => {
      setCurrentLabel(d.label);
      setNodes(storeMapperService.getNodes());
    });

    return () => { stepSub.remove(); nodeSub.remove(); labelSub.remove(); stopAutoScan(); };
  }, []);

  // ─── Gemini Vision Scan ──────────────────────────────────────────────────

  const autoScanNode = useCallback(async () => {
    if (!cameraRef.current || scanning || !API_KEY) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.35, base64: true, skipProcessing: true });
      if (!photo?.base64) return;

      const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: `You are mapping the inside of a store (supermarket/general store in Pakistan).
Look at this camera frame. Identify WHAT SECTION of the store this is.
Return ONLY a JSON: {"label": "Section Name", "products": ["product1", "product2"]}
Examples of labels: "Dairy Aisle", "Bakery", "Frozen Foods", "Beverages", "Checkout", "Snacks", "Entrance".
Keep label short (2-3 words max). List up to 4 visible products.` },
              { inline_data: { mime_type: 'image/jpeg', data: photo.base64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 128 },
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = raw.match(/\{[\s\S]*?\}/);
      if (!match) return;

      const result = JSON.parse(match[0]);
      storeMapperService.labelCurrentNode(result.label || 'Unknown', result.products || []);
      TtsService.speak(`${result.label} area. ${result.products?.slice(0, 2).join(', ') || ''}`);
    } catch { /* silent fail */ } finally {
      setScanning(false);
    }
  }, [scanning]);

  const stopAutoScan = () => {
    if (scanInterval.current) { clearInterval(scanInterval.current); scanInterval.current = null; }
  };

  // ─── Controls ────────────────────────────────────────────────────────────

  const startMapping = async () => {
    if (!storeName.trim()) {
      TtsService.speak('Pehle store ka naam likhein.');
      return;
    }
    const id = storeName.toLowerCase().replace(/\s+/g, '_') + '_' + city.toLowerCase().replace(/\s+/g, '_');
    setStoreId(id);
    setNodes([]);
    setStepCount(0);
    setCurrentLabel('Entrance');

    await storeMapperService.startMapping(storeName, AuthService.getCurrentUser()?.uid || 'anon');
    setIsMapping(true);
    setCurrentNodeId(storeMapperService.getCurrentNodeId());
    setNodes(storeMapperService.getNodes());

    hapticService.trigger('success');
    TtsService.speak(`${storeName} ki mapping shuru ho gayi. Chalna shuru karein. Main har qadam track karti hoon aur camera se sections identify karti hoon.`);
  };

  const stopAndSave = async () => {
    storeMapperService.stopMapping();
    setIsMapping(false);
    stopAutoScan();

    if (nodes.length < 2) {
      TtsService.speak('Map mein zyada data nahi hai. Thoda zyada chalein.');
      return;
    }

    setSaving(true);
    TtsService.speak('Map save ho raha hai Firebase par...');
    const ok = await storeMapperService.saveMap(storeId, storeName, city, AuthService.getCurrentUser()?.uid || 'anon');
    setSaving(false);

    if (ok) {
      hapticService.trigger('success');
      TtsService.speak(`${storeName} ka map save ho gaya! Ab koi bhi Seevia user yahan aake navigate kar sakta hai.`);
      Alert.alert('✅ Map Saved!', `${storeName} ka indoor map (${nodes.length} nodes) Firebase par upload ho gaya. Dusre Seevia users ab is map se navigate kar sakte hain.`,
        [{ text: 'Done', onPress: () => router.back() }]);
    } else {
      TtsService.speak('Map save nahi hua. Internet check karein.');
    }
  };

  const manualLabel = (label: string) => {
    storeMapperService.markSection(label);
    setCurrentLabel(label);
    setShowPresets(false);
    TtsService.speak(`${label} mark ho gaya.`);
    hapticService.trigger('light');
    setNodes(storeMapperService.getNodes());
  };

  // ─── Map Canvas (2D Grid) ────────────────────────────────────────────────

  const renderMapCanvas = () => {
    if (nodes.length === 0) return (
      <View style={styles.emptyMap}>
        <Ionicons name="map-outline" size={40} color={theme.textTertiary} />
        <Text style={[styles.emptyMapText, { color: theme.textTertiary }]}>Map yahaan dikhega</Text>
      </View>
    );

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const CELL = 22;
    const PAD = 12;

    const W = (maxX - minX + 1) * CELL + PAD * 2;
    const H = (maxY - minY + 1) * CELL + PAD * 2;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: W, height: H, position: 'relative' }}>
            {nodes.map(node => {
              const px = PAD + (node.x - minX) * CELL;
              const py = PAD + (node.y - minY) * CELL;
              const isCurrent = node.id === currentNodeId;
              const isLabeled = node.label && node.label !== 'Unknown';

              return (
                <TouchableOpacity
                  key={node.id}
                  style={[styles.mapNode, {
                    left: px, top: py,
                    backgroundColor: isCurrent ? theme.primary
                      : isLabeled ? `${theme.success}CC` : `${theme.textSecondary}44`,
                    width: isCurrent ? 18 : 12,
                    height: isCurrent ? 18 : 12,
                    borderRadius: isCurrent ? 9 : 6,
                    zIndex: isCurrent ? 10 : 1,
                  }]}
                  onPress={() => { storeMapperService.markSection(node.label || 'Unknown'); manualLabel(node.label || 'Tap to label'); }}
                >
                  {isLabeled && (
                    <Text style={styles.nodeLabel} numberOfLines={1}>{node.label.slice(0, 6)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Indoor Mapper</Text>
          <Text style={[styles.sub, { color: theme.textSecondary }]}>Walk the store to build its map</Text>
        </View>
        {isMapping && (
          <View style={[styles.recBadge, { backgroundColor: theme.danger }]}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Store Info (pre-mapping) */}
        {!isMapping && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Store Details</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder }]}
              placeholder="Store name (e.g. Save Mart F-10)"
              placeholderTextColor={theme.textTertiary}
              value={storeName}
              onChangeText={setStoreName}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder, marginTop: 8 }]}
              placeholder="City (e.g. Islamabad)"
              placeholderTextColor={theme.textTertiary}
              value={city}
              onChangeText={setCity}
            />
          </View>
        )}

        {/* Live camera preview during mapping */}
        {isMapping && hasCam && (
          <View style={styles.cameraBox}>
            <Camera ref={cameraRef} style={styles.camera} type={CameraType.back} />
            <View style={styles.cameraOverlay}>
              {scanning && <ActivityIndicator color="#FFF" size="small" />}
              <Text style={styles.cameraLabel}>{currentLabel || 'Scanning...'}</Text>
            </View>
          </View>
        )}

        {/* Stats row */}
        {isMapping && (
          <View style={styles.statsRow}>
            {[
              { icon: 'footsteps', value: stepCount, label: 'Steps' },
              { icon: 'map', value: nodes.length, label: 'Nodes' },
              { icon: 'layers', value: nodes.filter(n => n.label !== 'Unknown').length, label: 'Labeled' },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Ionicons name={s.icon as any} size={18} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Map canvas */}
        <View style={[styles.mapContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Live Map</Text>
          {renderMapCanvas()}
          <View style={styles.mapLegend}>
            {[
              { color: theme.primary, label: 'Current position' },
              { color: theme.success, label: 'Labeled section' },
              { color: `${theme.textSecondary}66`, label: 'Unexplored' },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Manual label */}
        {isMapping && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Label Current Spot</Text>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: `${theme.primary}22` }]}
                onPress={autoScanNode}
              >
                {scanning
                  ? <ActivityIndicator size="small" color={theme.primary} />
                  : <><Ionicons name="camera" size={16} color={theme.primary} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>Scan</Text></>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.presetToggle, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}44` }]}
              onPress={() => setShowPresets(!showPresets)}
            >
              <Ionicons name="list" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                {currentLabel || 'Select section...'}</Text>
              <Ionicons name={showPresets ? 'chevron-up' : 'chevron-down'} size={16} color={theme.primary} />
            </TouchableOpacity>

            {showPresets && (
              <View style={styles.presetGrid}>
                {SECTION_PRESETS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.presetChip, { backgroundColor: currentLabel === s ? theme.primary : `${theme.primary}18`, borderColor: theme.primary }]}
                    onPress={() => manualLabel(s)}
                  >
                    <Text style={{ color: currentLabel === s ? '#FFF' : theme.primary, fontSize: 12, fontWeight: '700' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* How it works */}
        {!isMapping && (
          <View style={[styles.card, { backgroundColor: `${theme.primary}0E`, borderColor: `${theme.primary}33` }]}>
            <Text style={[styles.cardTitle, { color: theme.primary }]}>How it works</Text>
            {[
              '1. Enter store name & city',
              '2. Press START at the entrance',
              '3. Walk every aisle normally',
              '4. Camera auto-labels sections via AI',
              '5. Tap sections to manually name them',
              '6. Press SAVE — map goes to Firebase',
              '7. Any Seevia user can now navigate this store!',
            ].map((s, i) => (
              <Text key={i} style={[styles.howStep, { color: theme.textSecondary }]}>{s}</Text>
            ))}
          </View>
        )}

        {/* Labeled sections list */}
        {nodes.filter(n => n.label && n.label !== 'Unknown').length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Mapped Sections</Text>
            {[...new Set(nodes.filter(n => n.label !== 'Unknown').map(n => n.label))].map(label => {
              const section = nodes.filter(n => n.label === label);
              return (
                <View key={label} style={styles.sectionRow}>
                  <View style={[styles.sectionDot, { backgroundColor: theme.success }]} />
                  <Text style={[styles.sectionName, { color: theme.text }]}>{label}</Text>
                  <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>{section.length} node{section.length > 1 ? 's' : ''}</Text>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Bottom control button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
        {saving
          ? <View style={[styles.primaryBtn, { backgroundColor: theme.card }]}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.primaryBtnText, { color: theme.primary }]}>Saving to Firebase...</Text>
            </View>
          : isMapping
            ? <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.danger }]} onPress={stopAndSave}>
                <Ionicons name="save" size={22} color="#FFF" />
                <Text style={styles.primaryBtnText}>Stop & Save Map</Text>
              </TouchableOpacity>
            : <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: storeName.trim() ? theme.primary : theme.cardBorder }]}
                onPress={startMapping}
                disabled={!storeName.trim()}
              >
                <Ionicons name="radio-button-on" size={22} color="#FFF" />
                <Text style={styles.primaryBtnText}>Start Mapping</Text>
              </TouchableOpacity>
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  backBtn: { padding: 8, borderRadius: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  recText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: SPACING.sm },
  input: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, height: 46, fontSize: 14, fontWeight: '500' },
  cameraBox: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden', height: 180 },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cameraLabel: { color: '#FFF', fontWeight: '700', fontSize: 14, flex: 1 },
  statsRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, alignItems: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, gap: 2 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  mapContainer: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, minHeight: 200 },
  emptyMap: { alignItems: 'center', justifyContent: 'center', height: 140, gap: SPACING.sm },
  emptyMapText: { fontSize: 13, fontWeight: '500' },
  mapNode: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  nodeLabel: { position: 'absolute', top: -14, fontSize: 8, fontWeight: '700', color: '#FFF', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 2 },
  mapLegend: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontWeight: '600' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm },
  presetToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  presetChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  howStep: { fontSize: 12, lineHeight: 22 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: SPACING.sm },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionName: { flex: 1, fontWeight: '700', fontSize: 13 },
  sectionCount: { fontSize: 11, fontWeight: '500' },
  bottomBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16, borderRadius: RADIUS.lg },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
