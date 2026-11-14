/**
 * Seevia Fall Detection Service — Physics-Based Accelerometer Model
 *
 * Algorithm:
 * 1. Measure acceleration magnitude continuously
 * 2. Detect FREE-FALL phase: magnitude drops below 0.4g (0-400ms window)
 * 3. Detect IMPACT phase: magnitude spikes above 2.5g immediately after
 * 4. Detect POST-FALL STILLNESS: near-zero variance for 1.5+ seconds
 * 5. Confirm = all 3 phases in sequence → FALL event
 *
 * This 3-phase approach mimics validated clinical fall-detection algorithms
 * and produces FAR fewer false positives than threshold-only models.
 */

import { Accelerometer } from 'expo-sensors';
import { Vibration, DeviceEventEmitter } from 'react-native';
import { logger } from '@/utils/logger';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

// ─── Thresholds (tuned for phone worn in pocket / held in hand) ────────────
const FREE_FALL_THRESHOLD  = 0.40;  // g  — magnitude below this = free-fall
const IMPACT_THRESHOLD     = 2.50;  // g  — magnitude above this = impact
const STILLNESS_THRESHOLD  = 0.12;  // g  — variance below this = still
const FREE_FALL_MIN_MS     = 60;    // ms — minimum free-fall duration
const FREE_FALL_MAX_MS     = 500;   // ms — free-fall window
const IMPACT_WINDOW_MS     = 300;   // ms — how long after fall to wait for impact
const STILLNESS_MIN_MS     = 1200;  // ms — still duration to confirm fall
const CONFIRM_COOLDOWN_MS  = 8000;  // ms — min gap between two fall events

interface FallEvent {
  timestamp: number;
  freeFallMs: number;
  impactMagnitude: number;
  confidence: number;
}

type FallPhase = 'MONITORING' | 'FREE_FALL' | 'IMPACT_WAIT' | 'STILLNESS_CHECK';

class FallDetectionService {
  private readonly MODULE = 'FALL_DETECTION';

  // State machine
  private phase: FallPhase = 'MONITORING';
  private phaseEnteredAt = 0;
  private freeFallStartedAt = 0;
  private impactMagnitude = 0;
  private lastFallAt = 0;
  private lastStableMagnitude = 1.0;
  private lastMonitoringReturnAt = 0; // Debounce rapid MONITORING re-triggers

  // Sliding window for stillness
  private readonly WINDOW_SIZE = 20;
  private magnitudeWindow: number[] = [];
  private readonly DEBOUNCE_MONITORING_MS = 300; // Prevent rapid cycling

  // Subscription
  private subscription: { remove: () => void } | null = null;
  private isEnabled = true;
  private isActive = false;

  // SOSCountdown
  private sosCountdown: ReturnType<typeof setTimeout> | null = null;
  private fallCancelled = false;

  // ─── Public API ──────────────────────────────────────────────────────────

  setEnabled(v: boolean) {
    this.isEnabled = v;
    logger.info(this.MODULE, `Fall detection ${v ? 'enabled' : 'disabled'}`);
  }

  isRunning() { return this.isActive; }

  async start(): Promise<boolean> {
    if (this.isActive) return true;
    try {
      Accelerometer.setUpdateInterval(50); // 20 Hz
      this.subscription = Accelerometer.addListener(data => this.onAccelData(data));
      this.isActive = true;
      logger.info(this.MODULE, '✅ Fall detection started at 20 Hz');
      return true;
    } catch (e) {
      logger.error(this.MODULE, 'Failed to start accelerometer', e);
      return false;
    }
  }

  stop() {
    this.subscription?.remove();
    this.subscription = null;
    this.isActive = false;
    if (this.sosCountdown) clearTimeout(this.sosCountdown);
    logger.info(this.MODULE, 'Fall detection stopped');
  }

  cancelFallResponse() {
    this.fallCancelled = true;
    if (this.sosCountdown) clearTimeout(this.sosCountdown);
    this.phase = 'MONITORING';
    TtsService.speak('Theek hai. Main yahan hoon. Cancel kar diya gaya.');
    DeviceEventEmitter.emit('FALL_CANCELLED');
    logger.info(this.MODULE, 'Fall response cancelled by user');
  }

  // ─── Core State Machine ──────────────────────────────────────────────────

  private onAccelData(data: { x: number; y: number; z: number }) {
    if (!this.isEnabled || !this.isActive) return;

    // Magnitude in g (expo-sensors returns in m/s², divide by 9.81)
    const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2) / 9.81;
    const now = Date.now();

    // Update sliding window
    this.magnitudeWindow.push(magnitude);
    if (this.magnitudeWindow.length > this.WINDOW_SIZE) this.magnitudeWindow.shift();

    // Track stable readings (near 1g = normal gravity)
    if (magnitude > 0.85 && magnitude < 1.15) {
      this.lastStableMagnitude = magnitude;
    }

    switch (this.phase) {

      case 'MONITORING':
        // Require hysteresis: magnitude must drop significantly AND we must be past debounce period
        const timeSinceLastMonitoring = now - this.lastMonitoringReturnAt;
        const droppedSignificantly = magnitude < FREE_FALL_THRESHOLD && 
          this.lastStableMagnitude > 0.85; // Had normal gravity before drop
        const pastDebounceWindow = timeSinceLastMonitoring >= this.DEBOUNCE_MONITORING_MS;
        
        if (droppedSignificantly && pastDebounceWindow) {
          this.phase = 'FREE_FALL';
          this.freeFallStartedAt = now;
          this.phaseEnteredAt = now;
          logger.info(this.MODULE, `Free-fall start (${magnitude.toFixed(2)}g, dropped from ${this.lastStableMagnitude.toFixed(2)}g)`);
        }
        break;

      case 'FREE_FALL': {
        const freeFallMs = now - this.freeFallStartedAt;

        // Exceeded max window — not a fall, back to monitoring with debounce
        if (freeFallMs > FREE_FALL_MAX_MS) {
          this.phase = 'MONITORING';
          this.lastMonitoringReturnAt = now;
          break;
        }

        // Impact detected (magnitude spiked while in free-fall window)
        if (magnitude > IMPACT_THRESHOLD && freeFallMs >= FREE_FALL_MIN_MS) {
          this.impactMagnitude = magnitude;
          this.phase = 'STILLNESS_CHECK';
          this.phaseEnteredAt = now;
          logger.info(this.MODULE, `Impact! ${magnitude.toFixed(2)}g after ${freeFallMs}ms free-fall`);
        }
        break;
      }

      case 'STILLNESS_CHECK': {
        const elapsed = now - this.phaseEnteredAt;

        // Check variance of recent window
        const variance = this.calcVariance(this.magnitudeWindow);

        if (variance < STILLNESS_THRESHOLD) {
          if (elapsed >= STILLNESS_MIN_MS) {
            // ✅ All 3 phases confirmed — FALL!
            const freeFallMs = this.phaseEnteredAt - this.freeFallStartedAt;
            const confidence = Math.min(1, (this.impactMagnitude / IMPACT_THRESHOLD) * 0.7
              + (freeFallMs / FREE_FALL_MAX_MS) * 0.3);

            this.onFallConfirmed({ timestamp: now, freeFallMs, impactMagnitude: this.impactMagnitude, confidence });
            this.phase = 'MONITORING';
            this.lastMonitoringReturnAt = now;
          }
        } else {
          // Movement resumed — reset (user recovered or false positive)
          this.phase = 'MONITORING';
          this.lastMonitoringReturnAt = now;
        }

        // Timeout — no stillness observed after impact, probably not a fall
        if (elapsed > 4000) {
          this.phase = 'MONITORING';
          this.lastMonitoringReturnAt = now;
        }
        break;
      }
    }
  }

  private async onFallConfirmed(event: FallEvent) {
    const now = Date.now();

    // Global cooldown to prevent rapid duplicate alerts
    if (now - this.lastFallAt < CONFIRM_COOLDOWN_MS) return;
    this.lastFallAt = now;
    this.fallCancelled = false;

    logger.warn(this.MODULE, `🚨 FALL CONFIRMED — confidence: ${(event.confidence * 100).toFixed(0)}%`);

    // Emit event for UI screens to catch
    DeviceEventEmitter.emit('FALL_DETECTED', event);

    // Haptic + Voice
    Vibration.vibrate([0, 300, 100, 300, 100, 300]);
    hapticService.trigger('error');
    TtsService.speak('GIRNA DETECT HUA! Kya aap theek hain? 10 seconds mein koi jawab nahi to emergency contact ko alert bheja jayega. Cancel karne ke liye "Theek hoon" bolein.');

    // 10-second countdown before auto-SOS
    this.sosCountdown = setTimeout(() => {
      if (!this.fallCancelled) {
        logger.warn(this.MODULE, 'Auto-SOS triggered after fall confirmation');
        DeviceEventEmitter.emit('VOICE_SOS', { reason: 'fall_detected', event });
        Vibration.vibrate([0, 600, 200, 600]);
        TtsService.speak('Emergency alert bheja ja raha hai! Madad aa rahi hai.');
      }
    }, 10000);
  }

  private calcVariance(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((acc, x) => acc + (x - mean) ** 2, 0) / data.length;
  }
}

export const fallDetectionService = new FallDetectionService();
export type { FallEvent };
