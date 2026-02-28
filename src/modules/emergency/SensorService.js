import { Accelerometer } from 'expo-sensors';
import { predict } from './FallDetector'; // Your m2cgen generated model

// Configuration constants based on your research
const THRESHOLD_3G = 3.0;        // Initial impact trigger
const INACTIVITY_LIMIT = 1.1;    // Max avg acceleration for "stillness"
const MONITOR_WINDOW_MS = 5000;  // 5 seconds total window
const SETTLING_TIME_MS = 750;    // Wait for the fall to finish

class SensorService {
  constructor() {
    this.subscription = null;
    this.isDetectionActive = false;
    this.buffer = [];
  }

  // Start the background listener
  start(onFallDetected) {
    Accelerometer.setUpdateInterval(20); // 50Hz frequency
    
    this.subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      const magnitude = Math.sqrt(x**2 + y**2 + z**2);

      if (magnitude > THRESHOLD_3G && !this.isDetectionActive) {
        this.initiateFallValidation(onFallDetected);
      }

      if (this.isDetectionActive) {
        this.buffer.push(magnitude);
      }
    });
  }

  async initiateFallValidation(onFallDetected) {
    this.isDetectionActive = true;
    this.buffer = [];

    // Wait 5 seconds to collect the full event pattern
    setTimeout(() => {
      this.processBuffer(onFallDetected);
    }, MONITOR_WINDOW_MS);
  }

  processBuffer(onFallDetected) {
    // 1. Post-fall Inactivity Check
    // We look at the last 2 seconds of the 5s buffer
    const postFallData = this.buffer.slice(-100); 
    const avgActivity = postFallData.reduce((a, b) => a + b, 0) / postFallData.length;

    if (avgActivity < INACTIVITY_LIMIT) {
      // 2. Prepare features for the Random Forest Brain
      // Using the 5 features identified in your Colab: [Peak, Mean, Var, Min, MaxX]
      const features = [
        Math.max(...this.buffer),
        avgActivity,
        this.calculateVariance(this.buffer),
        Math.min(...this.buffer),
        0.1 // Placeholder for Lateral X if needed
      ];

      // 3. AI Verdict
      const result = predict(features);
      
      if (result === 1) {
        onFallDetected(); 
      }
    }

    this.isDetectionActive = false;
    this.buffer = [];
  }

  calculateVariance(arr) {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  }

  stop() {
    if (this.subscription) this.subscription.remove();
    this.isDetectionActive = false;
  }
}

export default new SensorService();
