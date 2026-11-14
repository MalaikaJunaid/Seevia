/**
 * Seevia Navigation Screen
 * - Real Google Directions API (walking routes, Roman Urdu steps)
 * - Camera Walking Mode with Gemini obstacle detection
 * - Fall detection integration
 * - User stays inside Seevia — no external app redirect
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, DeviceEventEmitter, ActivityIndicator, Vibration,
  TextInput, Alert,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';
import { navigationService, NavStep, NavRoute } from '@/services/emergency/navigation.service';
import { obstacleDetectionService, ObstacleSeverity } from '@/services/emergency/obstacleDetection.service';
import { storeMapperService, StoreMap } from '@/services/indoor/storeMapper.service';
import { indoorNavigationService, IndoorStep } from '@/services/indoor/indoorNavigation.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

type NavMode = 'outdoor' | 'walking';

const SEVERITY_COLOR: Record<ObstacleSeverity, string> = {
  CLEAR: '#4CAF50', CAUTION: '#FFC107', WARNING: '#FF9800',
  DANGER: '#FF5722', STOP: '#F44336',
};
const SEVERITY_ICON: Record<ObstacleSeverity, string> = {
  CLEAR: 'checkmark-circle', CAUTION: 'eye', WARNING: 'warning',
  DANGER: 'alert-circle', STOP: 'stop-circle',
};

const QUICK_STORES = [
  { name: 'Carrefour', place: 'Carrefour Islamabad' },
  { name: 'Makro', place: 'Makro Islamabad' },
  { name: 'Giga Mall', place: 'Giga Mall Islamabad' },
  { name: 'CSD', place: 'CSD Islamabad' },
];

export default function StoreNavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ target?: string; mode?: string }>();
  const initialTarget = params.target || '';
  const initialMode = params.mode === 'walking' ? 'walking' : 'outdoor';

  const [mode, setMode] = useState<NavMode>(initialMode);
  const [destination, setDestination] = useState(initialTarget);
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [walkingActive, setWalkingActive] = useState(false);
  const [obstacleResult, setObstacleResult] = useState<{ severity: ObstacleSeverity; guidance: string } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  // Indoor map state
  const [indoorMap, setIndoorMap] = useState<StoreMap | null>(null);
  const [indoorSteps, setIndoorSteps] = useState<IndoorStep[]>([]);
  const [indoorStepIdx, setIndoorStepIdx] = useState(0);
  const [isIndoorMode, setIsIndoorMode] = useState(false);
  const [indoorCurrentNode, setIndoorCurrentNode] = useState('');

  const loadIndoorMap = async (storeName: string) => {
    if (!storeName.trim()) return;
    const storeId = storeName.toLowerCase().replace(/\s+/g, '_') + '_islamabad';
    const map = await storeMapperService.loadMap(storeId);
    if (map && map.nodes.length > 0) {
      setIndoorMap(map);
      setIndoorCurrentNode(map.entryNodeId);
      TtsService.speak(`${map.storeName} ka indoor map mil gaya! ${map.nodes.length} sections mapped hain. Kaunsi jagah jaana hai?`);
      hapticService.trigger('success');
      return true;
    }
    return false;
  };

  const navigateIndoor = (target: string) => {
    if (!indoorMap) return false;
    const startNode = indoorCurrentNode || indoorMap.entryNodeId;
    const steps = indoorNavigationService.findPath(indoorMap, startNode, target);
    if (!steps || steps.length === 0) {
      TtsService.speak(`${target} is map mein nahi mila. Outdoor rasta try karta hoon.`);
      return false;
    }
    setIndoorSteps(steps);
    setIndoorStepIdx(0);
    setIsIndoorMode(true);
    indoorNavigationService.announceRoute(steps, target);
    hapticService.trigger('success');
    return true;
  };

  const cameraRef = useRef<Camera>(null);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepPulse = useRef(new Animated.Value(1)).current;
  const isScanning = useRef(false);

  const currentStep: NavStep | null = route?.steps[currentStepIdx] ?? null;

  // Init
  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasCamera(status === 'granted'));
    requestLocation();

    const obsSub = DeviceEventEmitter.addListener('OBSTACLE_DETECTED', (r) => {
      setObstacleResult({ severity: r.severity, guidance: r.guidance });
    });
    const navSub = DeviceEventEmitter.addListener('START_INDOOR_NAV', (product: string) => {
      setDestination(product);
      fetchRoute(product);
    });
    const extSub = DeviceEventEmitter.addListener('NAVIGATE_EXTERNAL', (dest: string) => {
      setDestination(dest);
      fetchRoute(dest);
    });

    if (initialTarget) {
      setTimeout(() => fetchRoute(initialTarget), 600);
    }

    return () => {
      obsSub.remove(); navSub.remove(); extSub.remove();
      stopWalking();
    };
  }, []);

  // Pulse animation when navigating
  useEffect(() => {
    if (route && currentStep) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(stepPulse, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(stepPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
  }, [currentStepIdx, route]);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission nahi hai.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      setLocationError('GPS unavailable. Demo route use ho rahi hai.');
    }
  };

  const fetchRoute = async (dest?: string) => {
    const target = dest || destination;
    if (!target.trim()) { TtsService.speak('Destination batayein.'); return; }

    setLoading(true);
    setRoute(null);
    setIsIndoorMode(false);
    setCurrentStepIdx(0);
    TtsService.speak(`${target} ka rasta dhoondhta hoon...`);
    hapticService.trigger('light');

    try {
      // 1) Try loading stored indoor map first
      const hasIndoor = await loadIndoorMap(target);
      if (hasIndoor) {
        // Indoor map found — try to find the target section inside it
        const found = navigateIndoor(target);
        if (found) { setLoading(false); return; }
      }

      // 2) Fall back to Google Directions outdoor routing
      const coords = userCoords || { lat: 33.6844, lng: 73.0479 };
      const r = await navigationService.getRoute(coords, target);
      if (!r) throw new Error('No route');
      setRoute(r);
      setMode('outdoor');
      navigationService.announceRouteSummary(r);
    } catch {
      TtsService.speak('Rasta nahi mila. Internet check karein.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (!route) return;
    const next = currentStepIdx + 1;
    if (next >= route.steps.length) {
      TtsService.speak('Manzil aa gayi! Aap pahunch gaye. Mubarak ho!');
      hapticService.trigger('success');
      setRoute(null);
      return;
    }
    setCurrentStepIdx(next);
    navigationService.announceStep(route.steps[next]);
    hapticService.trigger('light');
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      const prev = currentStepIdx - 1;
      setCurrentStepIdx(prev);
      navigationService.announceStep(route!.steps[prev]);
      hapticService.trigger('light');
    }
  };

  const repeatStep = () => {
    if (currentStep) navigationService.announceStep(currentStep);
  };

  // ─── Walking / Camera Mode ───────────────────────────────────────────────

  const startWalking = async () => {
    if (!hasCamera) {
      Alert.alert('Camera Permission', 'Camera allow karein aur dobara try karein.');
      return;
    }
    setMode('walking');
    setWalkingActive(true);
    TtsService.speak('Walking mode on. Main camera se rasta check karti rehoongi. Koi khatara nazar aaya to bata doongi.');
    hapticService.trigger('success');

    scanInterval.current = setInterval(async () => {
      if (!cameraRef.current || isScanning.current) return;
      isScanning.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true, skipProcessing: true });
        if (!photo?.base64) return;
        await obstacleDetectionService.analyzeFrame(photo.base64);
      } catch { /* silent */ } finally {
        isScanning.current = false;
      }
    }, 4000); // Every 4 seconds
  };

  const stopWalking = () => {
    if (scanInterval.current) { clearInterval(scanInterval.current); scanInterval.current = null; }
    setWalkingActive(false);
    setObstacleResult(null);
    isScanning.current = false;
  };

  const exitWalking = () => {
    stopWalking();
    setMode('outdoor');
    TtsService.speak('Walking mode band ho gaya.');
  };

  // ─── WALKING MODE UI ─────────────────────────────────────────────────────
  if (mode === 'walking') {
    const sev = obstacleResult?.severity ?? 'CLEAR';
    const sevColor = SEVERITY_COLOR[sev];
    return (
      <View style={styles.root}>
        {hasCamera && (
          <Camera ref={cameraRef} style={StyleSheet.absoluteFill} type={CameraType.back} />
        )}
        {/* Dark overlay */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

        {/* Top bar */}
        <View style={[styles.walkingTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.exitBtn} onPress={exitWalking}>
            <Ionicons name="close-circle" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={[styles.walkingBadge, { backgroundColor: sevColor }]}>
            <Ionicons name={SEVERITY_ICON[sev] as any} size={16} color="#FFF" />
            <Text style={styles.walkingBadgeText}>{sev}</Text>
          </View>
          {walkingActive && (
            <View style={styles.scanningDot}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          )}
        </View>

        {/* Guidance card */}
        <View style={[styles.walkingBottom, { paddingBottom: insets.bottom + 16 }]}>
          {obstacleResult && (
            <View style={[styles.guidanceCard, { borderColor: sevColor, borderWidth: 2 }]}>
              <Ionicons name={SEVERITY_ICON[sev] as any} size={28} color={sevColor} />
              <Text style={styles.guidanceText}>{obstacleResult.guidance}</Text>
            </View>
          )}
          {!obstacleResult && (
            <View style={[styles.guidanceCard, { borderColor: '#4CAF50', borderWidth: 1 }]}>
              <Ionicons name="eye-outline" size={28} color="#4CAF50" />
              <Text style={styles.guidanceText}>Camera se rasta dekh rahi hoon...</Text>
            </View>
          )}
          <Text style={styles.walkingHint}>Har 4 seconds mein auto-scan · Danger = vibration</Text>
        </View>
      </View>
    );
  }

  // ─── MAIN NAV UI ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Navigation</Text>
        <TouchableOpacity
          style={[styles.walkModeBtn, { backgroundColor: walkingActive ? theme.danger : theme.primary }]}
          onPress={walkingActive ? exitWalking : startWalking}
        >
          <Ionicons name="walk" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Search bar */}
        <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Kahan jaana hai? (e.g. Carrefour)"
            placeholderTextColor={theme.textTertiary}
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={() => fetchRoute()}
            returnKeyType="search"
          />
          {loading
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <TouchableOpacity onPress={() => fetchRoute()}>
                <Ionicons name="navigate" size={22} color={theme.primary} />
              </TouchableOpacity>
          }
        </View>

        {locationError ? (
          <Text style={[styles.locationWarn, { color: theme.warning }]}>{locationError}</Text>
        ) : null}

        {/* Quick stores */}
        {!route && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>NEARBY STORES</Text>
            <View style={styles.storeGrid}>
              {QUICK_STORES.map(s => (
                <TouchableOpacity
                  key={s.name}
                  style={[styles.storeChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => { setDestination(s.name); fetchRoute(s.place); }}
                >
                  <Ionicons name="cart-outline" size={16} color={theme.primary} />
                  <Text style={[styles.storeChipText, { color: theme.text }]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Camera walking mode promo */}
            <TouchableOpacity
              style={[styles.walkPromo, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
              onPress={startWalking}
            >
              <View style={[styles.walkPromoIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="walk" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walkPromoTitle, { color: theme.text }]}>Walking Assistant</Text>
                <Text style={[styles.walkPromoSub, { color: theme.textSecondary }]}>
                  Camera se obstacles detect hoti hain · Vibration + voice warnings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </TouchableOpacity>

            {/* Indoor Map promo */}
            <TouchableOpacity
              style={[styles.walkPromo, { backgroundColor: `${theme.success}10`, borderColor: theme.success }]}
              onPress={() => router.push('/indoor-mapper')}
            >
              <View style={[styles.walkPromoIcon, { backgroundColor: theme.success }]}>
                <Ionicons name="map" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walkPromoTitle, { color: theme.text }]}>Map a Store</Text>
                <Text style={[styles.walkPromoSub, { color: theme.textSecondary }]}>
                  Walk any store once to build its indoor map · Shared with all Seevia users
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.success} />
            </TouchableOpacity>
          </>
        )}

        {/* ROUTE STEPS */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Rasta dhoondhta hoon...</Text>
          </View>
        )}

        {/* ── INDOOR NAVIGATION (stored map) ── */}
        {isIndoorMode && indoorSteps.length > 0 && !loading && (() => {
          const step = indoorSteps[indoorStepIdx];
          return (
            <>
              <View style={[styles.routeSummary, { backgroundColor: `${theme.success}15`, borderColor: theme.success }]}>
                <Ionicons name="map" size={18} color={theme.success} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={[styles.routeTitle, { color: theme.text }]}>Indoor Map Active</Text>
                  <Text style={[styles.routeMeta, { color: theme.textSecondary }]}>
                    {indoorMap?.storeName} · {indoorSteps.length} steps · {indoorSteps.length - indoorStepIdx} remaining
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setIsIndoorMode(false); setIndoorSteps([]); }}>
                  <Ionicons name="close-circle" size={22} color={theme.danger} />
                </TouchableOpacity>
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                {indoorSteps.map((_, i) => (
                  <View key={i} style={[styles.progressDot, {
                    backgroundColor: i < indoorStepIdx ? theme.success : i === indoorStepIdx ? theme.primary : theme.cardBorder,
                    width: i === indoorStepIdx ? 20 : 8,
                  }]} />
                ))}
              </View>

              {/* Current indoor step */}
              <Animated.View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.success, transform: [{ scale: stepPulse }] }]}>
                <View style={[styles.stepIconBox, { backgroundColor: `${theme.success}22` }]}>
                  <Ionicons name={
                    step.direction.includes('east') || step.direction.includes('right') ? 'arrow-forward' :
                    step.direction.includes('west') || step.direction.includes('left') ? 'arrow-back' :
                    step.isDestination ? 'flag' : 'arrow-up'
                  } size={36} color={theme.success} />
                </View>
                <Text style={[styles.stepCounter, { color: theme.success }]}>Indoor Step {indoorStepIdx + 1} / {indoorSteps.length}</Text>
                <Text style={[styles.stepText, { color: theme.text }]}>{step.instruction}</Text>
                <View style={styles.stepMeta}>
                  <View style={[styles.metaBadge, { backgroundColor: `${theme.success}18` }]}>
                    <Ionicons name="walk" size={12} color={theme.success} />
                    <Text style={[styles.metaText, { color: theme.success }]}>{Math.round(step.distanceM)}m</Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: `${theme.primary}18` }]}>
                    <Ionicons name="location" size={12} color={theme.primary} />
                    <Text style={[styles.metaText, { color: theme.primary }]}>{step.label || 'Section'}</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Indoor controls */}
              <View style={styles.navControls}>
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: indoorStepIdx === 0 ? 0.4 : 1 }]}
                  onPress={() => { if (indoorStepIdx > 0) { const p = indoorStepIdx - 1; setIndoorStepIdx(p); indoorNavigationService.announceStep(indoorSteps[p]); } }}
                  disabled={indoorStepIdx === 0}
                >
                  <Ionicons name="chevron-back" size={24} color={theme.text} />
                  <Text style={[styles.navBtnLabel, { color: theme.text }]}>Pichla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.repeatBtn, { backgroundColor: `${theme.success}18`, borderColor: `${theme.success}44` }]}
                  onPress={() => indoorNavigationService.announceStep(step)}
                >
                  <Ionicons name="volume-high" size={26} color={theme.success} />
                  <Text style={[styles.navBtnLabel, { color: theme.success }]}>Repeat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: theme.success }]}
                  onPress={() => {
                    if (indoorStepIdx >= indoorSteps.length - 1) {
                      TtsService.speak('Aap pahunch gaye! Manzil yahan hai. Mubarak ho!');
                      hapticService.trigger('success');
                      setIsIndoorMode(false);
                    } else {
                      const n = indoorStepIdx + 1;
                      setIndoorStepIdx(n);
                      indoorNavigationService.announceStep(indoorSteps[n]);
                      hapticService.trigger('light');
                    }
                  }}
                >
                  <Ionicons name={indoorStepIdx >= indoorSteps.length - 1 ? 'flag' : 'chevron-forward'} size={24} color="#FFF" />
                  <Text style={[styles.navBtnLabel, { color: '#FFF' }]}>
                    {indoorStepIdx >= indoorSteps.length - 1 ? 'Arrived' : 'Agla'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          );
        })()}

        {route && !loading && (
          <>
            {/* Route summary */}
            <View style={[styles.routeSummary, { backgroundColor: theme.card, borderColor: theme.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeTitle, { color: theme.text }]} numberOfLines={1}>{route.destination}</Text>
                <Text style={[styles.routeMeta, { color: theme.textSecondary }]}>
                  {route.totalDistanceText} · {route.totalDurationText} · {route.steps.length} steps
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setRoute(null); setDestination(''); }}>
                <Ionicons name="close-circle" size={22} color={theme.danger} />
              </TouchableOpacity>
            </View>

            {/* Progress dots */}
            <View style={styles.progressRow}>
              {route.steps.map((_, i) => (
                <View
                  key={i}
                  style={[styles.progressDot, {
                    backgroundColor: i < currentStepIdx ? theme.success : i === currentStepIdx ? theme.primary : theme.cardBorder,
                    width: i === currentStepIdx ? 20 : 8,
                  }]}
                />
              ))}
            </View>

            {/* Current step card */}
            {currentStep && (
              <Animated.View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.primary, transform: [{ scale: stepPulse }] }]}>
                <View style={[styles.stepIconBox, { backgroundColor: `${theme.primary}22` }]}>
                  <Ionicons
                    name={
                      currentStep.maneuver.includes('left') ? 'arrow-back' :
                      currentStep.maneuver.includes('right') ? 'arrow-forward' :
                      currentStep.maneuver === 'arrive' ? 'flag' : 'arrow-up'
                    }
                    size={36} color={theme.primary}
                  />
                </View>
                <Text style={[styles.stepCounter, { color: theme.primary }]}>
                  Step {currentStepIdx + 1} / {route.steps.length}
                </Text>
                <Text style={[styles.stepText, { color: theme.text }]}>{currentStep.urdu}</Text>
                <View style={styles.stepMeta}>
                  <View style={[styles.metaBadge, { backgroundColor: `${theme.primary}18` }]}>
                    <Ionicons name="walk" size={12} color={theme.primary} />
                    <Text style={[styles.metaText, { color: theme.primary }]}>{currentStep.distanceText}</Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: `${theme.secondary}18` }]}>
                    <Ionicons name="time" size={12} color={theme.secondary} />
                    <Text style={[styles.metaText, { color: theme.secondary }]}>{currentStep.durationText}</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Navigation controls */}
            <View style={styles.navControls}>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: currentStepIdx === 0 ? 0.4 : 1 }]}
                onPress={prevStep} disabled={currentStepIdx === 0}
              >
                <Ionicons name="chevron-back" size={24} color={theme.text} />
                <Text style={[styles.navBtnLabel, { color: theme.text }]}>Pichla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.repeatBtn, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}44` }]}
                onPress={repeatStep}
              >
                <Ionicons name="volume-high" size={26} color={theme.primary} />
                <Text style={[styles.navBtnLabel, { color: theme.primary }]}>Repeat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: theme.primary }]}
                onPress={nextStep}
              >
                <Ionicons name={currentStepIdx === route.steps.length - 1 ? 'flag' : 'chevron-forward'} size={24} color="#FFF" />
                <Text style={[styles.navBtnLabel, { color: '#FFF' }]}>
                  {currentStepIdx === route.steps.length - 1 ? 'Arrived' : 'Agla'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* All steps list */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ALL STEPS</Text>
            {route.steps.map((step, i) => (
              <TouchableOpacity
                key={step.id}
                style={[styles.stepListItem, {
                  backgroundColor: i === currentStepIdx ? `${theme.primary}18` : theme.card,
                  borderColor: i === currentStepIdx ? theme.primary : theme.cardBorder,
                  borderWidth: i === currentStepIdx ? 1.5 : 1,
                }]}
                onPress={() => { setCurrentStepIdx(i); navigationService.announceStep(step); }}
              >
                <View style={[styles.stepListNum, { backgroundColor: i < currentStepIdx ? theme.success : i === currentStepIdx ? theme.primary : theme.cardBorder }]}>
                  {i < currentStepIdx
                    ? <Ionicons name="checkmark" size={12} color="#FFF" />
                    : <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.stepListText, { color: i === currentStepIdx ? theme.text : theme.textSecondary }]} numberOfLines={2}>
                  {step.urdu}
                </Text>
                <Text style={[styles.stepListDist, { color: theme.textTertiary }]}>{step.distanceText}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating voice repeat */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          if (currentStep) navigationService.announceStep(currentStep);
          else if (route) navigationService.announceRouteSummary(route);
          else TtsService.speak('Koi route active nahi hai. Destination bolein ya likhein.');
        }}
      >
        <Ionicons name="volume-high" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, gap: SPACING.sm },
  backBtn: { padding: 8, borderRadius: 10 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800' },
  walkModeBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.md, height: 52, gap: SPACING.sm },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  locationWarn: { fontSize: 11, fontWeight: '600', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, marginTop: SPACING.md },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  storeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  storeChipText: { fontWeight: '700', fontSize: 13 },
  walkPromo: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1.5, gap: SPACING.md },
  walkPromoIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  walkPromoTitle: { fontWeight: '800', fontSize: 15 },
  walkPromoSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  loadingCard: { alignItems: 'center', paddingVertical: 48, gap: SPACING.md },
  loadingText: { fontWeight: '700', fontSize: 16 },
  routeSummary: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5 },
  routeTitle: { fontWeight: '800', fontSize: 15 },
  routeMeta: { fontSize: 12, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, gap: 4 },
  progressDot: { height: 6, borderRadius: 3 },
  stepCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, padding: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 2, alignItems: 'center' },
  stepIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  stepCounter: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  stepText: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26, marginTop: 8 },
  stepMeta: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  metaText: { fontSize: 12, fontWeight: '700' },
  navControls: { flexDirection: 'row', marginHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1, gap: 4 },
  repeatBtn: { flex: 1.3, alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5, gap: 4 },
  navBtnLabel: { fontSize: 12, fontWeight: '700' },
  stepListItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: 6, padding: SPACING.sm, borderRadius: RADIUS.md, gap: SPACING.sm },
  stepListNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepListText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  stepListDist: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  // Walking mode
  walkingTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 12 },
  exitBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 4 },
  walkingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  walkingBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  scanningDot: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 8 },
  walkingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  guidanceCard: { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: RADIUS.xl, padding: SPACING.lg, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  guidanceText: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '700', lineHeight: 24 },
  walkingHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', fontWeight: '500', marginBottom: 4 },
});
