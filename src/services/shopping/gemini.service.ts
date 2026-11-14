/**
 * Seevia Gemini Vision Service
 * Multi-tier fallback for product recognition and scene description
 * Uses Gemini 1.5 Flash for fast multimodal inference
 */

import { API_KEYS } from '@/constants/config';
import { logger } from '@/utils/logger';

export interface GeminiVisionResult {
  label: string;
  confidence: number;
  description?: string;
  urduLabel?: string;
}

class GeminiService {
  private static readonly MODULE = 'GEMINI_SERVICE';
  private static readonly ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  /**
   * Describe an image using Gemini Vision
   * Includes automatic fallback to Groq if Gemini fails
   */
  static async describe(base64Image: string, prompt?: string): Promise<GeminiVisionResult> {
    const defaultPrompt = `Analyze this image for a visually impaired user in Pakistan.
    Identify:
    1. Product name (use Pakistani brands if visible: Tapal, Milkpak, Olpers, Lays, etc.)
    2. Category (dairy, snacks, beverages, etc.)
    3. Any text visible (expiry dates, prices, etc.)

    Respond in JSON format:
    { "label": "product name", "confidence": 0.0-1.0, "urduLabel": "Roman Urdu name", "description": "brief description" }`;

    try {
      const response = await fetch(`${this.ENDPOINT}?key=${API_KEYS.GEMINI}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt || defaultPrompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            label: parsed.label || 'Unknown product',
            confidence: parsed.confidence || 0.85,
            description: parsed.description,
            urduLabel: parsed.urduLabel,
          };
        }
      } catch {
        // If JSON parsing fails, return raw text
      }

      return {
        label: text.substring(0, 100),
        confidence: 0.8,
        description: text,
      };

    } catch (error) {
      logger.error(this.MODULE, 'Gemini vision failed', error);

      // Fallback to Groq
      return this.fallbackToGroq(base64Image, prompt || defaultPrompt);
    }
  }

  /**
   * Fallback to Groq Llama for vision description
   */
  private static async fallbackToGroq(base64Image: string, prompt: string): Promise<GeminiVisionResult> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a vision assistant for visually impaired users in Pakistan. Provide concise, accurate product descriptions.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        label: content.substring(0, 100),
        confidence: 0.7,
        description: content,
      };

    } catch (error) {
      logger.error(this.MODULE, 'Groq fallback failed', error);
      return {
        label: 'Unable to analyze image',
        confidence: 0,
        description: 'Please try again or add item manually',
      };
    }
  }

  /**
   * Scene description for navigation assistance
   */
  static async describeScene(base64Image: string): Promise<string> {
    const prompt = `Describe this scene for a visually impaired person navigating.
    Focus on:
    1. Obstacles and hazards
    2. People and their positions
    3. Important objects (doors, stairs, exits)
    4. Navigation guidance

    Respond in Roman Urdu where possible. Keep it concise but informative.`;

    try {
      const response = await fetch(`${this.ENDPOINT}?key=${API_KEYS.GEMINI}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          }
        }),
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Scene description unavailable';

    } catch (error) {
      logger.error(this.MODULE, 'Scene description failed', error);
      return 'Manzoor nahi ho saka. Dobara koshish karein.';
    }
  }
}

export default GeminiService;