/**
 * BEHAVIORAL ANALYSIS SERVICE
 * Module 1: AI Personalization
 * 
 * Tracks user interaction patterns and learns behavior for proactive assistance
 * Implements collaborative filtering for personalized recommendations
 */

import { FirestoreService } from '@/services/firebase/firestore.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserBehavior {
  userId: string;
  interactions: {
    timestamp: number;
    action: string; // 'pantry_query', 'product_search', 'navigation_request', etc.
    intent: string; // Intent category
    success: boolean;
    duration: number; // seconds
    timestamp_hour: number; // Hour of day (0-23)
    day_of_week: number; // 0-6
  }[];
  patterns: {
    mostFrequentIntents: string[];
    peakActivityHours: number[];
    averageSessionLength: number;
    successRate: number;
    preferredInteractionMode: 'voice' | 'touch' | 'mixed';
  };
  recommendations: {
    predictedNextAction: string;
    confidence: number;
    nextCheckTime: number;
  };
  preferences: {
    ttsSpeed: number; // 0.8 - 1.5
    hapticIntensity: 'low' | 'medium' | 'high';
    audioAlertVolume: number; // 0-1
    preferredLanguage: 'en' | 'ur';
  };
}

class BehavioralAnalysisService {
  private readonly CACHE_KEY = '@seevia_behavior_cache';
  private readonly ANALYSIS_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MIN_SAMPLES = 10;

  /**
   * Record a user interaction
   */
  async recordInteraction(
    userId: string,
    action: string,
    intent: string,
    success: boolean,
    duration: number = 0
  ): Promise<void> {
    try {
      const now = new Date();
      const interaction = {
        timestamp: now.getTime(),
        action,
        intent,
        success,
        duration,
        timestamp_hour: now.getHours(),
        day_of_week: now.getDay(),
      };

      // Store locally
      const localData = await this.getLocalBehavior(userId);
      localData.interactions.push(interaction);
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(localData));

      // Sync to Firestore
      await FirestoreService.setDocument('behaviors', userId, {
        interactions: interaction,
        lastUpdated: now.toISOString(),
      }, { merge: true });

    } catch (error) {
      console.error('[BehavioralAnalysis] Recording interaction failed:', error);
    }
  }

  /**
   * Analyze patterns and generate recommendations
   */
  async analyzeAndRecommend(userId: string): Promise<UserBehavior['recommendations']> {
    try {
      const behavior = await this.getLocalBehavior(userId);

      // Need at least MIN_SAMPLES for meaningful analysis
      if (behavior.interactions.length < this.MIN_SAMPLES) {
        return {
          predictedNextAction: 'none',
          confidence: 0,
          nextCheckTime: Date.now() + this.ANALYSIS_INTERVAL,
        };
      }

      // Calculate patterns
      const patterns = this.calculatePatterns(behavior.interactions);

      // Predict next action using simple Markov chain
      const prediction = this.predictNextAction(behavior.interactions);

      // Generate recommendation
      const recommendation = {
        predictedNextAction: prediction.action,
        confidence: prediction.confidence,
        nextCheckTime: Date.now() + this.ANALYSIS_INTERVAL,
      };

      // Save updated behavior
      behavior.patterns = patterns;
      behavior.recommendations = recommendation;
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(behavior));

      // Sync to Firestore
      await FirestoreService.setDocument('behaviors', userId, {
        patterns,
        recommendations: recommendation,
      }, { merge: true });

      return recommendation;

    } catch (error) {
      console.error('[BehavioralAnalysis] Analysis failed:', error);
      return {
        predictedNextAction: 'none',
        confidence: 0,
        nextCheckTime: Date.now() + this.ANALYSIS_INTERVAL,
      };
    }
  }

  /**
   * Get proactive suggestion based on learned behavior
   * 
   * Roman Urdu Examples:
   * - "Aapko usually 4 PM ko chai ki cheeni chahiye hoti hai. Kya aaj bhi chahiye?" 
   *   (You usually want sugar for tea at 4 PM. Do you want it today?)
   * - "Aapka doodh kal khatam ho jayega. Shopping list mein add kardu?"
   *   (Your milk will finish tomorrow. Should I add to shopping list?)
   */
  async getProactiveSuggestion(userId: string): Promise<string | null> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const dayOfWeek = now.getDay();

      const behavior = await this.getLocalBehavior(userId);

      if (behavior.interactions.length < this.MIN_SAMPLES) {
        return null;
      }

      const patterns = behavior.patterns;

      // Check if this is a peak activity hour
      if (patterns.peakActivityHours.includes(currentHour)) {
        const mostLikelyIntent = patterns.mostFrequentIntents[0];

        // Generate suggestion in Roman Urdu
        const suggestions: { [key: string]: string } = {
          'pantry_query': `Aapke pantry mein ${this.getRandomPantryItem()} bachay ho sakte hain. Check karni hai?`,
          'product_search': 'Aapko shopping mein kya dhundna hai?',
          'navigation_request': 'Store mein kaunsa aisle dhundna hai?',
          'emergency_check': 'Kya sab theek hai?',
        };

        const suggestion = suggestions[mostLikelyIntent] || null;
        if (suggestion) {
          await TextToSpeechService.speak(suggestion);
        }
        return suggestion;
      }

      return null;

    } catch (error) {
      console.error('[BehavioralAnalysis] Suggestion generation failed:', error);
      return null;
    }
  }

  /**
   * Update user preferences based on behavior
   */
  async updatePreferences(userId: string, preferences: Partial<UserBehavior['preferences']>): Promise<void> {
    try {
      const behavior = await this.getLocalBehavior(userId);
      behavior.preferences = { ...behavior.preferences, ...preferences };

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(behavior));

      await FirestoreService.setDocument('behaviors', userId, {
        preferences: behavior.preferences,
      }, { merge: true });

    } catch (error) {
      console.error('[BehavioralAnalysis] Preference update failed:', error);
    }
  }

  /**
   * Get adaptive TTS speed based on user proficiency
   */
  async getAdaptiveTTSSpeed(userId: string): Promise<number> {
    try {
      const behavior = await this.getLocalBehavior(userId);
      
      // Start at normal speed
      let speed = 1.0;

      // Adjust based on success rate
      if (behavior.patterns.successRate > 0.9) {
        speed = 1.2; // User is proficient, speak faster
      } else if (behavior.patterns.successRate < 0.6) {
        speed = 0.8; // User struggles, speak slower
      }

      return Math.max(0.8, Math.min(1.5, speed));

    } catch (error) {
      console.error('[BehavioralAnalysis] TTS speed calculation failed:', error);
      return 1.0;
    }
  }

  // ===== PRIVATE METHODS =====

  private async getLocalBehavior(userId: string): Promise<UserBehavior> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[BehavioralAnalysis] Cache retrieval failed:', error);
    }

    return {
      userId,
      interactions: [],
      patterns: {
        mostFrequentIntents: [],
        peakActivityHours: [],
        averageSessionLength: 0,
        successRate: 0,
        preferredInteractionMode: 'voice',
      },
      recommendations: {
        predictedNextAction: 'none',
        confidence: 0,
        nextCheckTime: Date.now() + this.ANALYSIS_INTERVAL,
      },
      preferences: {
        ttsSpeed: 1.0,
        hapticIntensity: 'medium',
        audioAlertVolume: 0.8,
        preferredLanguage: 'ur',
      },
    };
  }

  private calculatePatterns(interactions: UserBehavior['interactions']): UserBehavior['patterns'] {
    const intents = interactions.map(i => i.intent);
    const hours = interactions.map(i => i.timestamp_hour);
    const durations = interactions.map(i => i.duration);
    const successCount = interactions.filter(i => i.success).length;

    // Most frequent intents
    const intentFreq = intents.reduce((acc, intent) => {
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostFrequentIntents = Object.entries(intentFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([intent]) => intent);

    // Peak activity hours (hours with >1 interaction)
    const hourFreq = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakActivityHours = Object.entries(hourFreq)
      .filter(([_, count]) => count > 1)
      .map(([hour]) => parseInt(hour));

    // Average session length
    const averageSessionLength = durations.length > 0
      ? durations.reduce((a, b) => a + b) / durations.length
      : 0;

    // Success rate
    const successRate = interactions.length > 0
      ? successCount / interactions.length
      : 0;

    return {
      mostFrequentIntents,
      peakActivityHours,
      averageSessionLength,
      successRate,
      preferredInteractionMode: 'voice', // Could be determined from data
    };
  }

  private predictNextAction(interactions: UserBehavior['interactions']): { action: string; confidence: number } {
    if (interactions.length === 0) {
      return { action: 'none', confidence: 0 };
    }

    // Simple Markov chain: look at last 3 actions
    const recentActions = interactions.slice(-3).map(i => i.action);

    // Find similar patterns in history
    let nextActionCounts: Record<string, number> = {};

    for (let i = 0; i < interactions.length - 3; i++) {
      const pattern = interactions.slice(i, i + 3).map(x => x.action);
      
      // Check if pattern matches recent actions
      if (JSON.stringify(pattern) === JSON.stringify(recentActions) && i + 3 < interactions.length) {
        const nextAction = interactions[i + 3].action;
        nextActionCounts[nextAction] = (nextActionCounts[nextAction] || 0) + 1;
      }
    }

    // Get most likely next action
    if (Object.keys(nextActionCounts).length === 0) {
      // Fallback: most common action
      const actionFreq = interactions.reduce((acc, i) => {
        acc[i.action] = (acc[i.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const [action, count] = Object.entries(actionFreq)
        .sort((a, b) => b[1] - a[1])[0] || ['none', 0];

      return {
        action,
        confidence: count / interactions.length,
      };
    }

    const [action, count] = Object.entries(nextActionCounts)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      action,
      confidence: Math.min(1, count / 5), // Normalize
    };
  }

  private getRandomPantryItem(): string {
    const items = ['cheeni', 'namak', 'doodh', 'ata', 'tel', 'miran', 'chai'];
    return items[Math.floor(Math.random() * items.length)];
  }
}

export const behavioralAnalysisService = new BehavioralAnalysisService();
export type { UserBehavior };
