/**
 * ANOMALY DETECTION SERVICE
 * Module 5: Emergency Systems - Advanced
 * 
 * Detects unusual activity patterns and environmental anomalies
 * Complements fall detection with broader safety monitoring
 */

import { sensorService } from "@/services/emergency/sensor.service";
import { TextToSpeechService } from "@/services/voice/textToSpeech.service";
import { hapticService } from "@/services/common/haptic.service";
import { logger } from "@/utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AnomalyScore {
  type: "inactivity" | "unusual_movement" | "environmental" | "behavioral";
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  timestamp: number;
  details: string;
  suggestedAction: "monitor" | "alert" | "escalate";
}

interface AnomalyBuffer {
  accelerometerHistory: number[];
  inactivityDuration: number;
  lastMovementTimestamp: number;
  baselineAcceleration: number;
  anomalies: AnomalyScore[];
}


class AnomalyDetectionService {
  private readonly CACHE_KEY = "@seevia_anomaly_buffer";
  private readonly INACTIVITY_THRESHOLD = 5 * 60 * 1000;
  private readonly ANOMALY_CHECK_INTERVAL = 5 * 1000;
  private readonly BASELINE_CALIBRATION_TIME = 30 * 1000;
  
  // 🛠️ DEMO-PROOF FIX: Cooldowns and Session tracking
  private readonly ALERT_COOLDOWN_MS = 60 * 1000; // Wait 1 min between audio alerts
  private lastAlertTime = 0;
  private sessionStartTime = Date.now(); // Used to ignore old cached timestamps on boot

  private monitoringActive = false;
  private baselineCalculated = false;
  private baselineAcceleration = 0.5;
  private isEnabled = true; // Can be disabled during onboarding

  /**
   * Enable or disable anomaly detection (disable during onboarding)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    // Reset session timer if re-enabling so it doesn't instantly trigger
    if (enabled) {
      this.sessionStartTime = Date.now(); 
    }
    
    logger.info('ANOMALY_DETECTION', `${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if anomaly detection is currently enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoringActive) return;
    this.monitoringActive = true;
    this.sessionStartTime = Date.now(); // Reset on start
    logger.info('ANOMALY_DETECTION', 'Monitoring started');
    try {
      if (!this.baselineCalculated) {
        await this.calibrateBaseline();
      }
      this.continuousMonitoring();
    } catch (error) {
      logger.error('ANOMALY_DETECTION', 'Error starting monitoring', error);
      this.monitoringActive = false;
    }
  }

  stopMonitoring(): void {
    this.monitoringActive = false;
    logger.info('ANOMALY_DETECTION', 'Monitoring stopped');
  }

  async detectInactivity(): Promise<AnomalyScore | null> {
    try {
      // Skip inactivity detection if disabled
      if (!this.isEnabled) {
        return null;
      }

      const now = Date.now();

      // 🛠️ DEMO-PROOF FIX 1: Ignore old cache on fresh boot
      // Gives you 5 clear minutes from the moment the app opens before triggering
      if (now - this.sessionStartTime < this.INACTIVITY_THRESHOLD) {
        return null;
      }

      const buffer = await this.getAnomalyBuffer();
      const inactivityDuration = now - buffer.lastMovementTimestamp;

      if (inactivityDuration > this.INACTIVITY_THRESHOLD) {
        const score: AnomalyScore = {
          type: "inactivity",
          severity: inactivityDuration > 10 * 60 * 1000 ? "critical" : "high",
          confidence: Math.min(1, inactivityDuration / (10 * 60 * 1000)),
          timestamp: now,
          details: `No significant movement for ${Math.round(inactivityDuration / 1000 / 60)} minutes`,
          suggestedAction: "alert",
        };

        // 🛠️ DEMO-PROOF FIX 2: Apply the TTS Cooldown
        if (score.confidence > 0.8 && (now - this.lastAlertTime > this.ALERT_COOLDOWN_MS)) {
          this.lastAlertTime = now; // Lock the cooldown
          await TextToSpeechService.speak("Aap bohot time se harkat nahi kar rahe. Kya sab theek hai? Madad chahiye?");
          await hapticService.trigger("warning");
        }
        
        return score;
      }
      return null;
    } catch (error) {
      logger.error('ANOMALY_DETECTION', 'Inactivity detection failed', error);
      return null;
    }
  }

  async detectUnusualMovement(): Promise<AnomalyScore | null> {
    try {
      const buffer = await this.getAnomalyBuffer();
      if (buffer.accelerometerHistory.length < 10) return null;
      const variance = this.calculateVariance(buffer.accelerometerHistory);
      const stdDev = Math.sqrt(variance);
      const threshold = this.baselineAcceleration + 2 * stdDev;
      const maxAccel = Math.max(...buffer.accelerometerHistory);
      if (maxAccel > threshold && stdDev > this.baselineAcceleration * 0.5) {
        return {
          type: "unusual_movement",
          severity: stdDev > this.baselineAcceleration ? "high" : "medium",
          confidence: Math.min(1, stdDev / (this.baselineAcceleration * 2)),
          timestamp: Date.now(),
          details: `Unusual acceleration pattern detected (${maxAccel.toFixed(2)}m/s²)`,
          suggestedAction: "monitor",
        };
      }
      return null;
    } catch (error) {
      console.error("[AnomalyDetection] Unusual movement detection failed:", error);
      return null;
    }
  }

  async detectEnvironmentalAnomalies(): Promise<AnomalyScore | null> {
    return null;
  }

  async detectBehavioralAnomalies(recentCommandCount: number, timeSinceLastCommand: number): Promise<AnomalyScore | null> {
    if (recentCommandCount > 10 && timeSinceLastCommand < 30 * 1000) {
      return { type: "behavioral", severity: "high", confidence: 0.85, timestamp: Date.now(), details: "Rapid repeated commands detected - possible distress signal", suggestedAction: "alert" };
    }
    if (timeSinceLastCommand > 2 * 60 * 1000) {
      return { type: "behavioral", severity: "medium", confidence: 0.7, timestamp: Date.now(), details: "Extended silence - user may be incapacitated", suggestedAction: "monitor" };
    }
    return null;
  }

  async getOverallRiskScore(): Promise<number> {
    try {
      const buffer = await this.getAnomalyBuffer();
      if (buffer.anomalies.length === 0) return 0;
      const now = Date.now();
      const recentAnomalies = buffer.anomalies.filter(a => now - a.timestamp < 5 * 60 * 1000);
      if (recentAnomalies.length === 0) return 0;
      const criticalAnomalies = recentAnomalies.filter(a => a.severity === "critical");
      if (criticalAnomalies.length > 0) {
        return criticalAnomalies.reduce((sum, a) => sum + a.confidence, 0) / criticalAnomalies.length;
      }
      const weightedScore = recentAnomalies.reduce((sum, a) => {
        const severityWeight = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.1 }[a.severity] || 0;
        return sum + a.confidence * severityWeight;
      }, 0) / recentAnomalies.length;
      return Math.min(1, weightedScore);
    } catch (error) {
      console.error("[AnomalyDetection] Risk score calculation failed:", error);
      return 0;
    }
  }

  async getAnomalyHistory(minutesBack: number = 60): Promise<AnomalyScore[]> {
    try {
      const buffer = await this.getAnomalyBuffer();
      const cutoffTime = Date.now() - minutesBack * 60 * 1000;
      return buffer.anomalies.filter(a => a.timestamp > cutoffTime);
    } catch (error) {
      return [];
    }
  }

  private async calibrateBaseline(): Promise<void> {
    try {
      console.log("[AnomalyDetection] Calibrating baseline...");
      const calibrationData: number[] = [];
      const start = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - start > this.BASELINE_CALIBRATION_TIME) {
          clearInterval(interval);
          if (calibrationData.length > 0) {
            this.baselineAcceleration = calibrationData.reduce((a, b) => a + b) / calibrationData.length;
            this.baselineCalculated = true;
            console.log(`[AnomalyDetection] Baseline: ${this.baselineAcceleration.toFixed(2)}m/s²`);
          }
          return;
        }
        try {
          const magnitude = await sensorService.getCurrentAcceleration();
          calibrationData.push(magnitude);
        } catch (e) {
          console.error("[AnomalyDetection] Calibration sample failed:", e);
        }
      }, 100);
    } catch (error) {
      console.error("[AnomalyDetection] Baseline calibration failed:", error);
      this.baselineCalculated = true;
    }
  }

  private async continuousMonitoring(): Promise<void> {
    while (this.monitoringActive) {
      try {
        const inactivityAnomaly = await this.detectInactivity();
        const movementAnomaly = await this.detectUnusualMovement();
        const environmentalAnomaly = await this.detectEnvironmentalAnomalies();
        const buffer = await this.getAnomalyBuffer();
        [inactivityAnomaly, movementAnomaly, environmentalAnomaly].filter(a => a !== null).forEach(a => {
          if (a && !this.isDuplicateAnomaly(buffer.anomalies, a)) {
            buffer.anomalies.push(a);
            if (buffer.anomalies.length > 100) buffer.anomalies.shift();
          }
        });
        await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(buffer));
        const riskScore = await this.getOverallRiskScore();
        if (riskScore > 0.8) await hapticService.trigger("warning");
      } catch (error) {
        console.error("[AnomalyDetection] Monitoring cycle failed:", error);
      }
      await new Promise(resolve => setTimeout(resolve, this.ANOMALY_CHECK_INTERVAL));
    }
  }

  private async getAnomalyBuffer(): Promise<AnomalyBuffer> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.error("[AnomalyDetection] Cache retrieval failed:", error);
    }
    return { accelerometerHistory: [], inactivityDuration: 0, lastMovementTimestamp: Date.now(), baselineAcceleration: this.baselineAcceleration, anomalies: [] };
  }

  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.map(x => (x - mean) ** 2).reduce((a, b) => a + b) / data.length;
  }

  private isDuplicateAnomaly(anomalies: AnomalyScore[], newAnomaly: AnomalyScore): boolean {
    const recentThreshold = Date.now() - 10 * 1000;
    return anomalies.some(a => a.type === newAnomaly.type && a.severity === newAnomaly.severity && a.timestamp > recentThreshold);
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
export type { AnomalyScore, AnomalyBuffer };