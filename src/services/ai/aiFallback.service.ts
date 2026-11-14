/**
 * Seevia Multi-Tier AI Fallback Service
 * Implements the confidence-based routing system:
 * - Local TFLite Model (> 0.75 confidence)
 * - HuggingFace Inference API (0.50-0.75 confidence)
 * - Cloud Fallback Gemini/Groq (< 0.50 or timeout)
 */

import { logger } from '@/utils/logger';
import { hapticService } from '../common/haptic.service';

// Confidence thresholds for assistive technology (0.95 safety requirement)
const CONFIDENCE_THRESHOLDS = {
  LOCAL: 0.95,       // Use local model only if confidence > 0.95
  HUGGINGFACE: 0.80, // Use HuggingFace if confidence 0.80-0.95
  CLOUD: 0,          // Use cloud fallback if confidence < 0.80
};

export type AIProvider = 'local' | 'huggingface' | 'gemini' | 'groq';
export type AITaskType = 'vision' | 'ocr' | 'intent' | 'scene_description' | 'emergency';

export interface AIResult<T = unknown> {
  success: boolean;
  data: T;
  confidence: number;
  provider: AIProvider;
  latency: number;
  error?: string;
}

export interface VisionResult {
  labels: Array<{ description: string; confidence: number }>;
  objects?: Array<{ name: string; confidence: number; boundingBox?: number[] }>;
  description?: string;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, string>;
}

export interface OCRResult {
  text: string;
  language?: string;
  blocks?: Array<{ text: string; boundingBox: number[] }>;
}

/**
 * AIFallbackService - Central orchestrator for all AI operations
 * with automatic fallback routing based on confidence and latency.
 */
class AIFallbackService {
  private readonly MODULE = 'AI_FALLBACK';

  // API endpoints
  private readonly GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private readonly GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly HUGGINGFACE_ENDPOINT = 'https://api-inference.huggingface.co/models';

  // Cache for repeated queries
  private cache = new Map<string, { result: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Execute a vision task with full fallback chain and timeout protection
   */
  async executeVisionTask(
    imageBase64: string,
    task: 'label_detection' | 'object_detection' | 'scene_description',
    localModel?: unknown
  ): Promise<AIResult<VisionResult>> {
    const startTime = Date.now();
    const cacheKey = `vision_${task}_${imageBase64.substring(0, 50)}`;

try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached as AIResult<VisionResult>;

      // Step 1: Try local TFLite model first
      if (localModel) {
        try {
          const localResult = await Promise.race([
            this.executeLocalVision(localModel, imageBase64),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Local vision timeout')), 2000)
            )
          ]) as any;

          if (localResult.confidence >= CONFIDENCE_THRESHOLDS.LOCAL) {
            logger.info(this.MODULE, `✓ Local vision success (${localResult.confidence.toFixed(2)})`);
            return this.cacheAndReturn(cacheKey, {
              success: true,
              data: localResult.data,
              confidence: localResult.confidence,
              provider: 'local',
              latency: Date.now() - startTime,
            });
          }
        } catch (localError) {
          logger.warn(this.MODULE, `Local vision failed: ${(localError as Error).message}`);
        }
      }

      // Step 2: Try HuggingFace Vision API (with timeout)
      try {
        const hfResult = await Promise.race([
          this.executeHuggingFaceVision(imageBase64, task),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('HuggingFace timeout')), 5000)
          )
        ]) as any;

        if (hfResult.confidence >= CONFIDENCE_THRESHOLDS.HUGGINGFACE) {
          logger.info(this.MODULE, `✓ HuggingFace vision success (${hfResult.confidence.toFixed(2)})`);
          return this.cacheAndReturn(cacheKey, {
            success: true,
            data: hfResult.data,
            confidence: hfResult.confidence,
            provider: 'huggingface',
            latency: Date.now() - startTime,
          });
        }
      } catch (hfError) {
        logger.warn(this.MODULE, `HuggingFace failed: ${(hfError as Error).message}`);
      }

      // Step 3: Cloud fallback - Gemini (with timeout)
      try {
        const geminiResult = await Promise.race([
          this.executeGeminiVision(imageBase64, task),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini timeout')), 8000)
          )
        ]) as any;

        logger.info(this.MODULE, `✓ Gemini vision success (${geminiResult.confidence.toFixed(2)})`);
        return this.cacheAndReturn(cacheKey, {
          success: true,
          data: geminiResult.data,
          confidence: geminiResult.confidence,
          provider: 'gemini',
          latency: Date.now() - startTime,
        });
      } catch (geminiError) {
        logger.error(this.MODULE, `Gemini vision failed: ${(geminiError as Error).message}`);
      }

// All methods failed - return empty result
      return this.cacheAndReturn(cacheKey, {
        success: false,
        data: { labels: [], objects: [] },
        confidence: 0,
        provider: 'local',
        latency: Date.now() - startTime,
        error: 'All vision providers failed',
      });
    } catch (error) {
      logger.error(this.MODULE, 'Vision task failed critically', error);
      return {
        success: false,
        data: { labels: [], objects: [] },
        confidence: 0,
        provider: 'local',
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute intent classification with fallback chain
   */
  async classifyIntent(
    text: string,
    language: 'en' | 'ur' = 'en'
  ): Promise<AIResult<IntentResult>> {
    const startTime = Date.now();
    const cacheKey = `intent:${text}:${language}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as AIResult<IntentResult>;
    }

    try {
      // Step 1: Local pattern matching (fastest)
      const localResult = await this.executeLocalIntent(text, language);
      if (localResult.confidence >= CONFIDENCE_THRESHOLDS.LOCAL) {
        await hapticService.success();
        return this.cacheAndReturn(cacheKey, {
          success: true,
          data: localResult.data,
          confidence: localResult.confidence,
          provider: 'local',
          latency: Date.now() - startTime,
        });
      }

      // Step 2: HuggingFace DistilBERT for intent
      const hfResult = await this.executeHuggingFaceIntent(text);
      if (hfResult.confidence >= CONFIDENCE_THRESHOLDS.HUGGINGFACE) {
        return this.cacheAndReturn(cacheKey, {
          success: true,
          data: hfResult.data,
          confidence: hfResult.confidence,
          provider: 'huggingface',
          latency: Date.now() - startTime,
        });
      }

      // Step 3: Groq for fast intent classification
      const groqResult = await this.executeGroqIntent(text, language);
      return this.cacheAndReturn(cacheKey, {
        success: true,
        data: groqResult.data,
        confidence: groqResult.confidence,
        provider: 'groq',
        latency: Date.now() - startTime,
      });

    } catch (error) {
      logger.error(this.MODULE, 'Intent classification failed', error);
      return {
        success: false,
        data: { intent: 'unknown', entities: {} },
        confidence: 0,
        provider: 'local',
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute OCR with fallback
   */
  async executeOCR(imageBase64: string): Promise<AIResult<OCRResult>> {
    const startTime = Date.now();

    try {
      // Step 1: Try local EasyOCR simulation (on-device)
      const localResult = await this.executeLocalOCR(imageBase64);
      if (localResult.confidence >= CONFIDENCE_THRESHOLDS.LOCAL) {
        return {
          success: true,
          data: localResult.data,
          confidence: localResult.confidence,
          provider: 'local',
          latency: Date.now() - startTime,
        };
      }

      // Step 2: Google Vision API
      const visionResult = await this.executeGoogleVisionOCR(imageBase64);
      return {
        success: true,
        data: visionResult.data,
        confidence: visionResult.confidence,
        provider: 'gemini',
        latency: Date.now() - startTime,
      };

    } catch (error) {
      logger.error(this.MODULE, 'OCR failed', error);
      return {
        success: false,
        data: { text: '' },
        confidence: 0,
        provider: 'local',
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Scene description for blind users - uses Gemini's multimodal capability
   */
  async describeScene(imageBase64: string, context?: string): Promise<AIResult<string>> {
    const startTime = Date.now();

    try {
      const prompt = context
        ? `Describe this scene for a visually impaired person. Context: ${context}. Provide clear, actionable information about what's around them, including potential obstacles, people, and important objects. Respond in a friendly, helpful tone.`
        : `Describe this scene for a visually impaired person. What do you see? Provide clear, actionable information about what's around them, including potential obstacles, people, and important objects. Keep the response concise but informative.`;

      const response = await fetch(`${this.GEMINI_ENDPOINT}?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
          }
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const description = data.candidates[0].content.parts[0].text;
        return {
          success: true,
          data: description,
          confidence: 0.9,
          provider: 'gemini',
          latency: Date.now() - startTime,
        };
      }

      throw new Error('Invalid Gemini response');

    } catch (error) {
      logger.error(this.MODULE, 'Scene description failed', error);
      return {
        success: false,
        data: 'I cannot see the scene clearly. Please try again.',
        confidence: 0,
        provider: 'gemini',
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  // ============== PRIVATE METHODS ==============

  private async executeLocalVision(model: unknown, imageBase64: string): Promise<{ data: VisionResult; confidence: number }> {
    // Simulated local inference - in production, this would use tfjs-react-native
    // with the TFLite models loaded from src/assets/models/
    return {
      data: { labels: [], objects: [] },
      confidence: 0.5, // Placeholder - actual implementation would run TFLite inference
    };
  }

  private async executeHuggingFaceVision(imageBase64: string, task: string): Promise<{ data: VisionResult; confidence: number }> {
    try {
      const model = task === 'object_detection'
        ? 'facebook/detr-resnet-50'
        : 'google/vit-base-patch16-224';

      const response = await fetch(`${this.HUGGINGFACE_ENDPOINT}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: imageBase64 }),
      });

      const data = await response.json();

      // Parse response based on model type
      const labels = Array.isArray(data)
        ? data.map((item: { label: string; score: number }) => ({
            description: item.label,
            confidence: item.score,
          }))
        : [];

      return {
        data: { labels },
        confidence: labels.length > 0 ? Math.max(...labels.map(l => l.confidence)) : 0.3,
      };

    } catch (error) {
      logger.warn(this.MODULE, 'HuggingFace vision failed', error);
      return { data: { labels: [] }, confidence: 0 };
    }
  }

  private async executeGeminiVision(imageBase64: string, task: string): Promise<{ data: VisionResult; confidence: number }> {
    const prompts = {
      label_detection: 'Identify all objects and products in this image. List them with confidence scores.',
      object_detection: 'Detect all objects in this image with their approximate locations. Return as JSON.',
      scene_description: 'Describe this scene in detail for a visually impaired person navigating their environment.',
    };

    const response = await fetch(`${this.GEMINI_ENDPOINT}?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompts[task as keyof typeof prompts] || prompts.label_detection },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      data: { labels: [{ description, confidence: 0.85 }], description },
      confidence: 0.85,
    };
  }

  /**
   * Execute Groq vision task (Llama 3.1 with vision via text description)
   */
  private async executeGroqVision(imageBase64: string, task: string): Promise<{ data: VisionResult; confidence: number }> {
    try {
      const systemPrompt = `You are a vision assistant for a visually impaired person. Analyze the described image and identify:
1. All objects and products visible
2. Any text or labels present
3. Potential navigation hazards or important items

Return a JSON object with:
{
  "labels": [{"description": "item name", "confidence": 0.0-1.0}],
  "objects": [{"name": "object name", "confidence": 0.0-1.0, "location": "position"}],
  "description": "brief scene description for blind user"
}

Be precise and safety-focused. For assistive technology, accuracy is critical.`;

      // Note: Groq doesn't have native vision, so we use Llama to process context
      // In practice, this would receive image description from prior Gemini call
      const response = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Task: ${task}. Analyze and respond with structured JSON.` }
          ],
          temperature: 0.1,
          max_tokens: 500,
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      try {
        const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
        return {
          data: {
            labels: parsed.labels || [],
            objects: parsed.objects || [],
            description: parsed.description,
          },
          confidence: 0.75,
        };
      } catch {
        return {
          data: { labels: [{ description: content, confidence: 0.7 }] },
          confidence: 0.7,
        };
      }
    } catch (error) {
      logger.error(this.MODULE, 'Groq vision failed', error);
      return { data: { labels: [] }, confidence: 0 };
    }
  }

  private async executeLocalIntent(text: string, language: string): Promise<{ data: IntentResult; confidence: number }> {
    // Enhanced Roman Urdu + English pattern matching
    const patterns: Record<string, RegExp[]> = {
      navigate_home: [
        /^(go\s*home|dashboard|main\s*screen|wapis\s*chalo|shuruat|ghar\s*chalo)$/i,
      ],
      navigate_pantry: [
        /^(open\s*pantry|kitchen\s*list|khana\s*dikhao|pantry\s*kholo|ghar\s*ka\s*samman)$/i,
      ],
      add_item: [
        /^add\s+(.+)/i,
        /^put\s+(.+)\s+in\s*pantry/i,
        /^(.+)\s+rakh\s*do$/i,
        /^nayi\s+cheez\s+(.+)/i,
      ],
      identify_product: [
        /^(what\s*is\s*this|identify|samne\s*kya\s*hai|pehchano|yeh\s*kya\s*hai)$/i,
      ],
      emergency: [
        /^(help|emergency|sos|bachao|madad\s*karo|madad\s*cahiye)$/i,
      ],
      read_text: [
        /^(read\s*this|what\s*does\s*it\s*say|parh\s*kar\s*batao|read\s*label)$/i,
      ],
    };

    const lowerText = text.toLowerCase().trim();

    for (const [intent, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        const match = lowerText.match(regex);
        if (match) {
          // Extract entities if pattern has capture groups
          const entities: Record<string, string> = {};
          if (match[1]) {
            entities.itemName = match[1].trim();
          }
          return {
            data: { intent, entities },
            confidence: 0.95, // High confidence for pattern matches
          };
        }
      }
    }

    return {
      data: { intent: 'unknown', entities: {} },
      confidence: 0.3,
    };
  }

  private async executeHuggingFaceIntent(text: string): Promise<{ data: IntentResult; confidence: number }> {
    try {
      const response = await fetch(`${this.HUGGINGFACE_ENDPOINT}/distilbert-base-uncased-finetuned-sst-2-english`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      const data = await response.json();

      // HuggingFace intent classification would use a fine-tuned model
      // This is a placeholder for the actual intent classification
      return {
        data: { intent: 'unknown', entities: {} },
        confidence: data.score || 0.5,
      };

    } catch (error) {
      return { data: { intent: 'unknown', entities: {} }, confidence: 0 };
    }
  }

  private async executeGroqIntent(text: string, language: string): Promise<{ data: IntentResult; confidence: number }> {
    try {
      const systemPrompt = language === 'ur'
        ? 'You are an intent classifier for Roman Urdu commands. Classify the intent from: navigate_home, navigate_pantry, add_item, remove_item, identify_product, read_text, emergency, describe_scene, unknown. Respond with JSON: {"intent": "...", "entities": {...}, "confidence": 0.0-1.0}'
        : 'You are an intent classifier. Classify the intent from: navigate_home, navigate_pantry, add_item, remove_item, identify_product, read_text, emergency, describe_scene, unknown. Respond with JSON: {"intent": "...", "entities": {...}, "confidence": 0.0-1.0}';

      const response = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 100,
        })
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';

      try {
        const parsed = JSON.parse(content);
        return {
          data: {
            intent: parsed.intent || 'unknown',
            entities: parsed.entities || {}
          },
          confidence: parsed.confidence || 0.7,
        };
      } catch {
        return {
          data: { intent: 'unknown', entities: {} },
          confidence: 0.5,
        };
      }

    } catch (error) {
      logger.error(this.MODULE, 'Groq intent failed', error);
      return { data: { intent: 'unknown', entities: {} }, confidence: 0 };
    }
  }

  private async executeLocalOCR(imageBase64: string): Promise<{ data: OCRResult; confidence: number }> {
    // Placeholder for on-device OCR using TFLite
    return {
      data: { text: '' },
      confidence: 0.3,
    };
  }

  private async executeGoogleVisionOCR(imageBase64: string): Promise<{ data: OCRResult; confidence: number }> {
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: imageBase64 },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 10 },
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 5 }
              ],
            }],
          }),
        }
      );

      const data = await response.json();
      const annotations = data.responses?.[0]?.textAnnotations;

      if (annotations && annotations.length > 0) {
        return {
          data: {
            text: annotations[0].description,
            language: annotations[0].locale,
            blocks: annotations.slice(1).map((a: { description: string; boundingPoly: { vertices: { x: number; y: number }[] } }) => ({
              text: a.description,
              boundingBox: a.boundingPoly?.vertices?.flatMap((v: { x: number; y: number }) => [v.x || 0, v.y || 0]) || [],
            })),
          },
          confidence: 0.9,
        };
      }

      return { data: { text: '' }, confidence: 0.3 };

    } catch (error) {
      logger.error(this.MODULE, 'Google Vision OCR failed', error);
      return { data: { text: '' }, confidence: 0 };
    }
  }

  // Cache utilities
  private getFromCache(key: string): AIResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result as AIResult;
    }
    return null;
  }

  private cacheAndReturn<T>(key: string, result: AIResult<T>): AIResult<T> {
    this.cache.set(key, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.cache.clear();
    logger.info(this.MODULE, 'Cache cleared');
  }
}

export const aiFallbackService = new AIFallbackService();