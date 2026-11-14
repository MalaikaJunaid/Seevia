/**
 * Seevia Scanner — Complete rewrite
 *
 * expo-camera ~13.4.x API (Camera component with onBarCodeScanned)
 * Modes: Product · Scene · Text · Color · Danger · Allergen
 * All modes are voice-triggerable + touch-triggerable
 * Full Roman Urdu TTS feedback at every step
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Alert, DeviceEventEmitter, ActivityIndicator, ScrollView,
} from 'react-native';
import { Camera, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '../theme/colors';
import { SPACING, RADIUS } from '../theme';
import { hapticService } from '../services/common/haptic.service';
import { cameraVisionService } from '../services/pantry/cameraVision.service';
import { allergenService } from '../services/pantry/allergen.service';
import { PantryService } from '../services/pantry/pantry.service';
import { AuthService } from '../services/firebase/auth.service';
import { PantryCategory } from '../models/PantryItem';
// @ts-ignore
import TtsService from '../services/voice/TtsService';
import { logger } from '../utils/logger';

type ScanMode = 'product' | 'scene' | 'text' | 'color' | 'danger' | 'allergen';

interface ScanResult {
  label: string;
  detail: string;
  allergens?: string[];
  isSafe?: boolean;
  productName?: string;
  category?: string;
  expiryDate?: string | null;
  confidence?: number;
}

const MODES: { id: ScanMode; label: string; icon: string; urdu: string; color: string }[] = [
  { id: 'product',  label: 'Product',  icon: 'cube',          urdu: 'Product scan karo',   color: theme.primary },
  { id: 'scene',    label: 'Scene',    icon: 'eye',            urdu: 'Samne kya hai',        color: '#2196F3' },
  { id: 'text',     label: 'Text',     icon: 'document-text', urdu: 'Text parho',           color: '#9C27B0' },
  { id: 'color',    label: 'Color',    icon: 'color-palette', urdu: 'Rang batao',           color: '#FF9800' },
  { id: 'danger',   label: 'Danger',   icon: 'warning',       urdu: 'Khatara check karo',   color: '#F44336' },
  { id: 'allergen', label: 'Allergen', icon: 'shield-checkmark', urdu: 'Allergen check karo', color: '#4CAF50' },
];

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; product?: string }>();
  const user = AuthService.getCurrentUser();

  const cameraRef = useRef<Camera>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mode, setMode]             = useState<ScanMode>((params.mode as ScanMode) || 'product');
  const [flashOn, setFlashOn]       = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult]         = useState<ScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState('Capture karo ya voice command do');
  const [barcodeMode, setBarcodeMode] = useState(false);

  // ── Camera permission ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        TtsService.speak('Camera permission chahiye. Settings mein allow karein.');
      }
    })();
  }, []);

  // ── Voice events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('VOICE_TRIGGER_SCAN', () => {
        setMode('product'); setResult(null);
        setTimeout(() => capture(), 800);
      }),
      DeviceEventEmitter.addListener('TRIGGER_COLOR_DETECTION', () => {
        setMode('color'); setResult(null);
        setTimeout(() => capture(), 800);
      }),
      DeviceEventEmitter.addListener('START_DANGER_DETECTION', () => {
        setMode('danger'); setResult(null);
        setTimeout(() => capture(), 800);
      }),
      DeviceEventEmitter.addListener('TRIGGER_SCENE_SCAN', () => {
        setMode('scene'); setResult(null);
        setTimeout(() => capture(), 800);
      }),
      DeviceEventEmitter.addListener('TRIGGER_TEXT_SCAN', () => {
        setMode('text'); setResult(null);
        setTimeout(() => capture(), 800);
      }),
      DeviceEventEmitter.addListener('TRIGGER_ALLERGEN_SCAN', (product?: string) => {
        if (product) {
          doAllergenCheck(product);
        } else {
          setMode('allergen'); setResult(null);
          setTimeout(() => capture(), 800);
        }
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  // ── Handle incoming params (e.g. direct product allergen check) ───────────────
  useEffect(() => {
    if (params.product) doAllergenCheck(params.product);
  }, [params.product]);

  // ── Pulse animation while processing ─────────────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isProcessing]);

  // ── Result fade-in ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (result) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [result]);

  // ─── Core capture + analyze ───────────────────────────────────────────────────
  const capture = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      setIsProcessing(true);
      setResult(null);
      setScanStatus('Photo le raha hoon...');
      hapticService.trigger('light');
      TtsService.speak('Photo le raha hoon...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo');

      setScanStatus('Analyze ho raha hai...');
      TtsService.speak('Analyze ho raha hai...');

      await processImage(photo.uri);
    } catch (err: any) {
      logger.error('SCANNER', 'Capture error', err);
      const msg = 'Scan nahi ho saka. Roshni zyada karein aur dobara try karein.';
      setScanStatus(msg);
      TtsService.speak(msg);
      hapticService.trigger('error');
    } finally {
      setIsProcessing(false);
    }
  }, [mode, isProcessing]);

  // ─── Process image by mode ────────────────────────────────────────────────────
  const processImage = async (uri: string) => {
    switch (mode) {
      case 'scene': {
        const desc = await cameraVisionService.describeScene(uri, 'general');
        TtsService.speak(desc);
        hapticService.trigger('success');
        setResult({ label: 'Scene', detail: desc });
        setScanStatus('Scene described!');
        break;
      }

      case 'danger': {
        const desc = await cameraVisionService.describeScene(uri, 'danger');
        const isDanger = /rukein|khatara|danger|gutter|khadda|wall|door|step/i.test(desc);
        TtsService.speak(desc);
        hapticService.trigger(isDanger ? 'error' : 'success');
        setResult({ label: 'Safety Check', detail: desc, isSafe: !isDanger });
        setScanStatus(isDanger ? 'Khatara mila!' : 'Rasta saaf hai');
        break;
      }

      case 'color': {
        const color = await cameraVisionService.identifyColor(uri);
        TtsService.speak(color);
        hapticService.trigger('success');
        setResult({ label: 'Color', detail: color });
        setScanStatus('Rang identify hua!');
        break;
      }

      case 'text': {
        const text = await cameraVisionService.recognizeText(uri);
        const preview = text.length > 150 ? text.substring(0, 150) + '...' : text;
        TtsService.speak(`Text mila: ${preview}`);
        hapticService.trigger('success');
        setResult({ label: 'Text Read', detail: text });
        setScanStatus('Text parh liya!');
        break;
      }

      case 'allergen': {
        // Scan product first, then check allergens
        const prod = await cameraVisionService.analyzeProduct(uri);
        await doAllergenCheck(prod.productName, prod.allergens);
        break;
      }

      case 'product':
      default: {
        const prod = await cameraVisionService.analyzeProduct(uri);
        const expStr = prod.expiryDate ? `Expiry: ${prod.expiryDate}.` : '';
        const algStr = prod.allergens?.length
          ? `Allergens: ${prod.allergens.join(', ')}.`
          : 'Koi known allergen nahi.';
        const speech = `${prod.productName}. ${prod.category}. ${expStr} ${algStr}`;
        TtsService.speak(speech);
        hapticService.trigger('success');
        setResult({
          label: prod.productName,
          detail: prod.description,
          category: prod.category,
          expiryDate: prod.expiryDate,
          allergens: prod.allergens,
          productName: prod.productName,
          confidence: prod.confidence,
        });
        setScanStatus('Product identify hua!');
        break;
      }
    }
  };

  // ─── Allergen check (by name OR from scanned allergens) ──────────────────────
  const doAllergenCheck = async (productName: string, knownAllergens?: string[]) => {
    try {
      setIsProcessing(true);
      setScanStatus(`${productName} check ho raha hai...`);
      TtsService.speak(`${productName} ke allergens check kar raha hoon...`);

      let userAllergens: string[] = [];
      try {
        const { UserProfileService } = await import('../services/firebase/userProfile.service');
        const profile = await UserProfileService.getUserProfile(user?.uid || '');
        userAllergens = profile?.allergies || [];
      } catch {}
      if (userAllergens.length === 0) userAllergens = ['peanuts', 'dairy', 'gluten'];

      const check = await allergenService.verifySafetyWithAI(productName, userAllergens);
      TtsService.speak(check.message);
      hapticService.trigger(check.isSafe ? 'success' : 'error');

      setResult({
        label: 'Allergen Check',
        detail: check.message,
        isSafe: check.isSafe,
        allergens: knownAllergens,
        productName,
      });
      setScanStatus(check.isSafe ? '✅ Safe hai!' : '⚠ Allergen mila!');
    } catch (e) {
      TtsService.speak('Allergen check fail ho gaya. Internet check karein.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Barcode scan handler ─────────────────────────────────────────────────────
  const onBarcodeScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (isProcessing || result || !barcodeMode) return;
    logger.info('SCANNER', `Barcode: ${data}`);
    hapticService.trigger('light');
    TtsService.speak('Barcode mila. Product dhoondh raha hoon...');
    setIsProcessing(true);
    try {
      // Use barcode data as search text, NOT as image path
      const productName = `Product barcode: ${data}`;
      await doAllergenCheck(productName);
    } catch {
      TtsService.speak('Barcode process nahi hua.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, result, barcodeMode]);

  // ─── Add to Pantry ────────────────────────────────────────────────────────────
  const addToPantry = async () => {
    if (!result?.productName || !user) return;
    try {
      hapticService.trigger('light');
      await PantryService.addPantryItem(user.uid, {
        name: result.productName,
        category: (result.category as PantryCategory) || PantryCategory.OTHER,
        quantity: 1,
        unit: 'pieces',
        lowStockThreshold: 1,
        expiryDate: result.expiryDate || undefined,
        allergens: result.allergens,
      });
      TtsService.speak(`${result.productName} pantry mein add ho gaya.`);
      hapticService.trigger('success');
      setResult(null);
      router.back();
    } catch {
      TtsService.speak('Pantry mein add karne mein masla aya.');
    }
  };

  // ─── Permission screens ───────────────────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="camera-outline" size={72} color={theme.textSecondary} />
        <Text style={[styles.permTitle, { color: theme.text }]}>Camera Permission Required</Text>
        <Text style={[styles.permSub, { color: theme.textSecondary }]}>
          Seevia ko camera access chahiye taake woh aapki aankhein ban sake.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.primaryBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeMode = MODES.find(m => m.id === mode)!;

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]}>

      {/* ── Camera Viewfinder ─────────────────────────────────────────────────── */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        flashMode={flashOn ? FlashMode.on : FlashMode.off}
        onBarCodeScanned={barcodeMode ? onBarcodeScanned : undefined}
      >
        {/* Scan frame overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            <View style={[styles.modeBadge, { backgroundColor: activeMode.color + 'CC' }]}>
              <Ionicons name={activeMode.icon as any} size={14} color="#FFF" />
              <Text style={styles.modeBadgeText}>{activeMode.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setFlashOn(v => !v)}>
                <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, barcodeMode && { backgroundColor: theme.primary + '88' }]}
                onPress={() => {
                  setBarcodeMode(v => !v);
                  TtsService.speak(barcodeMode ? 'Barcode mode off' : 'Barcode mode on. Barcode samne rakhein.');
                }}
              >
                <Ionicons name="barcode" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Corner frame guides */}
          <View style={styles.frameBox} pointerEvents="none">
            {['tl','tr','bl','br'].map(corner => (
              <View key={corner} style={[
                styles.corner,
                corner.includes('t') ? { top: 0 } : { bottom: 0 },
                corner.includes('l') ? { left: 0 } : { right: 0 },
                { borderColor: activeMode.color },
              ]} />
            ))}
          </View>

          {/* Status text */}
          <View style={styles.statusBox} pointerEvents="none">
            <Text style={styles.statusText}>{isProcessing ? '🔄 ' + scanStatus : scanStatus}</Text>
          </View>
        </View>
      </Camera>

      {/* ── Mode selector ─────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.modeBar, { backgroundColor: '#111' }]}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
      >
        {MODES.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.modeChip,
              { borderColor: m.color, backgroundColor: mode === m.id ? m.color + '33' : 'transparent' },
            ]}
            onPress={() => {
              setMode(m.id);
              setResult(null);
              TtsService.speak(m.urdu);
              hapticService.trigger('light');
            }}
          >
            <Ionicons name={m.icon as any} size={16} color={mode === m.id ? m.color : '#888'} />
            <Text style={[styles.modeChipText, { color: mode === m.id ? m.color : '#888' }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Result panel ──────────────────────────────────────────────────────── */}
      {result && (
        <Animated.View style={[styles.resultPanel, { opacity: fadeAnim, backgroundColor: '#111' }]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
            {/* Safety indicator */}
            {result.isSafe !== undefined && (
              <View style={[styles.safetyBadge, { backgroundColor: result.isSafe ? '#4CAF5022' : '#F4433622', borderColor: result.isSafe ? '#4CAF50' : '#F44336' }]}>
                <Ionicons name={result.isSafe ? 'checkmark-circle' : 'warning'} size={16} color={result.isSafe ? '#4CAF50' : '#F44336'} />
                <Text style={[styles.safetyText, { color: result.isSafe ? '#4CAF50' : '#F44336' }]}>
                  {result.isSafe ? 'SAFE' : 'CAUTION'}
                </Text>
              </View>
            )}

            <Text style={[styles.resultLabel, { color: activeMode.color }]}>{result.label}</Text>
            <Text style={styles.resultDetail}>{result.detail}</Text>

            {/* Product metadata */}
            {result.category && (
              <View style={styles.metaRow}>
                <Ionicons name="pricetag" size={13} color="#888" />
                <Text style={styles.metaText}>{result.category}</Text>
                {result.confidence && (
                  <Text style={[styles.metaText, { color: result.confidence > 0.7 ? '#4CAF50' : '#FF9800' }]}>
                    · {Math.round(result.confidence * 100)}% confident
                  </Text>
                )}
              </View>
            )}
            {result.expiryDate && (
              <View style={styles.metaRow}>
                <Ionicons name="calendar" size={13} color="#888" />
                <Text style={styles.metaText}>Expires: {result.expiryDate}</Text>
              </View>
            )}
            {result.allergens && result.allergens.length > 0 && (
              <View style={styles.metaRow}>
                <Ionicons name="alert-circle" size={13} color="#FF9800" />
                <Text style={[styles.metaText, { color: '#FF9800' }]}>{result.allergens.join(', ')}</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.resultActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={() => setResult(null)}>
              <Ionicons name="camera" size={16} color="#FFF" />
              <Text style={styles.actionText}>Retake</Text>
            </TouchableOpacity>

            {result.productName && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={addToPantry}>
                <Ionicons name="add-circle" size={16} color="#FFF" />
                <Text style={styles.actionText}>Add to Pantry</Text>
              </TouchableOpacity>
            )}

            {result.productName && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => doAllergenCheck(result.productName!)}>
                <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                <Text style={styles.actionText}>Check Safe?</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Capture button ─────────────────────────────────────────────────────── */}
      {!result && (
        <View style={[styles.captureBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.captureRing, { borderColor: activeMode.color }]}
            onPress={capture}
            disabled={isProcessing}
          >
            <Animated.View
              style={[
                styles.captureBtn,
                { backgroundColor: isProcessing ? '#555' : activeMode.color },
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name={activeMode.icon as any} size={28} color="#FFF" />
              }
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.captureLabel}>
            {isProcessing ? scanStatus : `Capture — ${activeMode.label}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  camera: { flex: 1 },

  // Overlay
  overlay:   { flex: 1, justifyContent: 'space-between' },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.4)' },
  iconBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  modeBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // Frame corners
  frameBox:  { position: 'absolute', top: '20%', left: '10%', right: '10%', bottom: '35%' },
  corner:    { position: 'absolute', width: 24, height: 24, borderWidth: 3 },

  // Status
  statusBox: { alignItems: 'center', paddingBottom: 16 },
  statusText: { color: '#FFF', fontSize: 13, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },

  // Mode bar
  modeBar:   { maxHeight: 56, backgroundColor: '#111' },

  // Mode chips
  modeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, marginVertical: 8 },
  modeChipText: { fontSize: 12, fontWeight: '700' },

  // Result panel
  resultPanel:   { maxHeight: 320, padding: SPACING.md, borderTopWidth: 1, borderTopColor: '#222' },
  safetyBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 8 },
  safetyText:    { fontWeight: '800', fontSize: 12 },
  resultLabel:   { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  resultDetail:  { color: '#CCC', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaText:      { color: '#999', fontSize: 12 },
  resultActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: RADIUS.md },
  actionText:    { color: '#FFF', fontWeight: '700', fontSize: 12 },

  // Capture
  captureBar:  { alignItems: 'center', paddingTop: 16, backgroundColor: '#000' },
  captureRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  captureBtn:  { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  captureLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },

  // Permission
  permTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permSub:   { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  primaryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});