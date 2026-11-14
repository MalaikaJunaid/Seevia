/**
 * Seevia Obstacle Detection Service
 *
 * Uses Gemini Vision API to analyze camera frames in real-time.
 * Classifies obstacles into 5 severity levels and provides
 * specific directional guidance + haptic + TTS.
 *
 * This replaces YOLO inference (not runnable in Expo without native modules).
 * Gemini 1.5 Flash is fast enough (~800ms/frame) for walking-pace assistance.
 */

import { DeviceEventEmitter, Vibration } from 'react-native';
import { logger } from '@/utils/logger';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

export type ObstacleSeverity = 'CLEAR' | 'CAUTION' | 'WARNING' | 'DANGER' | 'STOP';

export interface ObstacleResult {
  severity: ObstacleSeverity;
  obstacles: string[];           // e.g. ['step', 'wall']
  direction: 'ahead' | 'left' | 'right' | 'multiple';
  guidance: string;              // Roman Urdu TTS string
  confidence: number;
}

const SEVERITY_HAPTICS: Record<ObstacleSeverity, () => void> = {
  CLEAR:   () => {},
  CAUTION: () => Vibration.vibrate(80),
  WARNING: () => Vibration.vibrate([0, 100, 80, 100]),
  DANGER:  () => Vibration.vibrate([0, 200, 100, 200]),
  STOP:    () => Vibration.vibrate([0, 500, 150, 500, 150, 500]),
};

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

const OBSTACLE_PROMPT = `You are an AI safety guide embedded in a phone app for a VISUALLY IMPAIRED person who is walking.
Analyze this camera frame and detect ALL obstacles or hazards.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "severity": "CLEAR|CAUTION|WARNING|DANGER|STOP",
  "obstacles": ["obstacle1", "obstacle2"],
  "direction": "ahead|left|right|multiple",
  "guidance": "ONE short sentence in Roman Urdu giving SPECIFIC direction (e.g. '2 qadam ruk jayein, seedha darwaza hai.')",
  "confidence": 0.0-1.0
}

Severity levels:
- CLEAR: Nothing blocking the path — free to walk
- CAUTION: Minor object (small step, puddle, slight slope) — slow down
- WARNING: Moderate obstacle (parked cycle, trash bin, chair) — reroute needed
- DANGER: High-risk hazard (open gutter, edge of platform, traffic) — stop
- STOP: Immediate threat (vehicle approaching, deep hole, stairs) — stop immediately

If the camera is covered, blurry, or you cannot see the path, respond with severity CAUTION and guidance about unclear view.`;

class ObstacleDetectionService {
  private readonly MODULE = 'OBSTACLE_DETECTION';
  private readonly API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  private lastSpeakAt = 0;
  private lastSeverity: ObstacleSeverity = 'CLEAR';
  private readonly SPEAK_COOLDOWN_CLEAR = 8000;  // Don't repeat "path clear" too often
  private readonly SPEAK_COOLDOWN_DANGER = 1500; // Danger always speaks fast

  async analyzeFrame(imageBase64: string): Promise<ObstacleResult> {
    if (!this.API_KEY) {
      return this.makeDefault('CAUTION', 'Gemini API key nahi hai. Dheeray chalein.');
    }

    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: OBSTACLE_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON even if surrounded by extra text
      const match = raw.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error('No JSON in response');

      const result = JSON.parse(match[0]) as ObstacleResult;
      this.processResult(result);
      return result;
    } catch (e) {
      logger.error(this.MODULE, 'Gemini Vision failed', e);
      return this.makeDefault('CAUTION', 'Camera analysis fail. Dheeray chalein aur ahtiyat karein.');
    }
  }

  private processResult(result: ObstacleResult) {
    const now = Date.now();
    const severity = result.severity;

    // Emit to UI
    DeviceEventEmitter.emit('OBSTACLE_DETECTED', result);

    // Haptic feedback (always, regardless of cooldown)
    SEVERITY_HAPTICS[severity]?.();

    // TTS cooldown logic
    const cooldown = severity === 'CLEAR' ? this.SPEAK_COOLDOWN_CLEAR
      : severity === 'STOP' || severity === 'DANGER' ? this.SPEAK_COOLDOWN_DANGER
      : 3000;

    // Always speak if severity increased
    const severityRank: Record<ObstacleSeverity, number> = {
      CLEAR: 0, CAUTION: 1, WARNING: 2, DANGER: 3, STOP: 4,
    };

    const severityIncreased = severityRank[severity] > severityRank[this.lastSeverity];

    if (severityIncreased || now - this.lastSpeakAt >= cooldown) {
      this.lastSpeakAt = now;
      this.lastSeverity = severity;
      TtsService.speak(result.guidance);
    }

    // Log for debugging
    logger.info(this.MODULE, `[${severity}] ${result.obstacles.join(', ')} — ${result.guidance}`);
  }

  private makeDefault(severity: ObstacleSeverity, guidance: string): ObstacleResult {
    return { severity, obstacles: [], direction: 'ahead', guidance, confidence: 0.5 };
  }
}

export const obstacleDetectionService = new ObstacleDetectionService();
