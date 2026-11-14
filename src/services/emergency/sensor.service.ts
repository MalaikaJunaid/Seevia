import * as Sensors from 'expo-sensors';
import { logger } from '@/utils/logger';

/**
 * Seevia Sensor Service
 * Advanced fall detection using multi-sensor fusion: accelerometer + gyroscope
 *
 * Fall Detection Algorithm:
 * 1. Phase 1 (Free-fall): Rapid downward acceleration + rapid angular velocity
 * 2. Phase 2 (Impact): High acceleration magnitude indicating contact
 * 3. Phase 3 (Post-fall): Low, stable acceleration indicating prone position
 * 
 * Confidence scoring prevents false positives from normal activities (sitting quickly, jumping)
 */

export interface FallDetectionResult {
  isFall: boolean;
  confidence: number;
  phase: 'pre-fall' | 'falling' | 'impact' | 'post-fall' | 'normal';
  accelerationMagnitude: number;
  angularVelocity: number;
  timestamp: number;
}

export interface SensorConfig {
  spikeThreshold: number;
  lowAccelerationThreshold: number;
  highImpactThreshold: number;
  spikeSamplesRequired: number;
  stillnessSamplesRequired: number;
  gyroscopeThreshold: number;
  confidenceThreshold: number;
}

class SensorService {
  private static readonly MODULE = 'SENSOR_SERVICE';
  private isMonitoring = false;
  
  // Sensor data
  private accelerometerData = { x: 0, y: 0, z: 0 };
  private gyroscopeData = { x: 0, y: 0, z: 0 };
  private accelerationHistory: FallDetectionResult[] = [];
  
  // Subscriptions with proper types
  private accelerometerSubscription: Sensors.SensorSubscription | null = null;
  private gyroscopeSubscription: Sensors.SensorSubscription | null = null;
  
  // Configuration with improved thresholds (0.95 for assistive tech safety)
  private config: SensorConfig = {
    spikeThreshold: 25, // Reduced for better sensitivity
    lowAccelerationThreshold: 8,
    highImpactThreshold: 50,
    spikeSamplesRequired: 3,
    stillnessSamplesRequired: 5,
    gyroscopeThreshold: 100, // degrees per second
    confidenceThreshold: 0.95, // Increased from 0.75 to 0.95 for safety
  };
  
  // History management
  private readonly HISTORY_SIZE = 30; // 3 seconds at 10Hz
  private readonly UPDATE_INTERVAL = 100; // 100ms = 10Hz
  
  // Recovery system for false positive prevention
  private lastFallTime: number = 0;
  private readonly MIN_FALL_INTERVAL = 5000; // Minimum 5 seconds between falls
  private fallRecoveryCount = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  /**
   * Start monitoring sensors for fall detection
   * Subscribes to both accelerometer and gyroscope for multi-sensor fusion
   */
  start(onFallDetected: (result: FallDetectionResult) => void): void {
    if (this.isMonitoring) {
      logger.warn(SensorService.MODULE, 'Sensor monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.accelerationHistory = [];
    this.fallRecoveryCount = 0;
    
    logger.info(SensorService.MODULE, 'Starting sensor monitoring for fall detection', this.config);

    // Set sensor update intervals (100ms = 10 Hz frequency)
    Sensors.Accelerometer.setUpdateInterval(this.UPDATE_INTERVAL);
    Sensors.Gyroscope.setUpdateInterval(this.UPDATE_INTERVAL);

    // Subscribe to accelerometer events
    this.accelerometerSubscription = Sensors.Accelerometer.addListener((data) => {
      this.accelerometerData = data;
      try {
        this.processSensorData(onFallDetected);
      } catch (error) {
        logger.error(SensorService.MODULE, 'Fall detection error', error);
      }
    });

    // Subscribe to gyroscope events
    this.gyroscopeSubscription = Sensors.Gyroscope.addListener((data) => {
      this.gyroscopeData = data;
    });
  }

  /**
   * Stop monitoring sensors
   */
  stop(): void {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }
    this.isMonitoring = false;
    this.accelerationHistory = [];
    logger.info(SensorService.MODULE, 'Stopped sensor monitoring');
  }

  /**
   * Process sensor data and detect falls using multi-sensor fusion
   */
  private processSensorData(onFallDetected: (result: FallDetectionResult) => void): void {
    const result = this.detectFall();
    
    // Update history
    this.accelerationHistory.push(result);
    if (this.accelerationHistory.length > this.HISTORY_SIZE) {
      this.accelerationHistory.shift();
    }

    // Detect fall pattern with confidence scoring
    if (result.isFall && result.confidence >= this.config.confidenceThreshold) {
      // Prevent false positives - check time interval
      if (Date.now() - this.lastFallTime > this.MIN_FALL_INTERVAL) {
        this.lastFallTime = Date.now();
        this.fallRecoveryCount = 0;
        
        logger.warn(SensorService.MODULE, 'FALL DETECTED', {
          confidence: result.confidence,
          acceleration: result.accelerationMagnitude,
          angularVelocity: result.angularVelocity,
          phase: result.phase,
        });
        
        onFallDetected(result);
      } else {
        logger.debug(SensorService.MODULE, 'Fall detected but too soon after last fall (ignoring)');
      }
    }
  }

  /**
   * Advanced fall detection using multi-sensor fusion
   * Combines accelerometer and gyroscope data for higher accuracy
   */
  private detectFall(): FallDetectionResult {
    const magnitude = this.getAccelerationMagnitude();
    const angularVel = this.getAngularVelocityMagnitude();
    
    // Determine phase and confidence
    let phase: 'pre-fall' | 'falling' | 'impact' | 'post-fall' | 'normal' = 'normal';
    let confidence = 0;
    let isFall = false;

    // Phase 1: Free-fall (high angular velocity + moderate acceleration drop)
    if (
      angularVel > this.config.gyroscopeThreshold &&
      magnitude < 15
    ) {
      phase = 'falling';
      confidence = 0.6;
    }

    // Phase 2: Impact (very high acceleration spike)
    if (magnitude > this.config.highImpactThreshold) {
      phase = 'impact';
      confidence = Math.min(1.0, (magnitude / 80) * 0.8 + 0.2);
      
      // Check gyroscope confirmation
      if (angularVel > this.config.gyroscopeThreshold) {
        confidence = Math.min(1.0, confidence + 0.15);
      }
    }

    // Phase 3: Post-fall (low acceleration sustained over time)
    if (magnitude < this.config.lowAccelerationThreshold) {
      const recentAccelerations = this.accelerationHistory
        .slice(-this.config.stillnessSamplesRequired)
        .map(r => r.accelerationMagnitude);
      
      if (
        recentAccelerations.length >= this.config.stillnessSamplesRequired &&
        recentAccelerations.every(a => a < this.config.lowAccelerationThreshold)
      ) {
        phase = 'post-fall';
        
        // Check if there was a spike before this stillness
        const beforeStillness = this.accelerationHistory.slice(
          -this.config.stillnessSamplesRequired - this.config.spikeSamplesRequired,
          -this.config.stillnessSamplesRequired
        );
        
        if (beforeStillness.some(r => r.accelerationMagnitude > this.config.spikeThreshold)) {
          isFall = true;
          confidence = 0.85;
        }
      }
    }

    // Check spike pattern (classic fall signature)
    const recentSpikes = this.accelerationHistory
      .slice(-10)
      .filter(r => r.accelerationMagnitude > this.config.spikeThreshold).length;

    if (recentSpikes >= this.config.spikeSamplesRequired) {
      confidence = Math.min(1.0, confidence + 0.2);
      isFall = true;
    }

    return {
      isFall,
      confidence,
      phase,
      accelerationMagnitude: magnitude,
      angularVelocity: angularVel,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate acceleration magnitude (m/s²)
   */
  private getAccelerationMagnitude(): number {
    return Math.sqrt(
      this.accelerometerData.x ** 2 +
      this.accelerometerData.y ** 2 +
      this.accelerometerData.z ** 2
    );
  }

  /**
   * Calculate angular velocity magnitude (degrees/s)
   */
  private getAngularVelocityMagnitude(): number {
    return Math.sqrt(
      this.gyroscopeData.x ** 2 +
      this.gyroscopeData.y ** 2 +
      this.gyroscopeData.z ** 2
    ) * (180 / Math.PI); // Convert rad/s to deg/s
  }

  /**
   * Update sensor configuration
   */
  setConfig(updates: Partial<SensorConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info(SensorService.MODULE, 'Sensor config updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SensorConfig {
    return { ...this.config };
  }

  /**
   * Get current acceleration magnitude (for debugging)
   */
  getCurrentAcceleration(): number {
    return this.getAccelerationMagnitude();
  }

  /**
   * Get current angular velocity magnitude (for debugging)
   */
  getCurrentAngularVelocity(): number {
    return this.getAngularVelocityMagnitude();
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
}

export const sensorService = new SensorService();
