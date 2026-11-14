/**
 * Seevia Camera Vision Service — GROQ LLAMA-4 SCOUT POWERED
 *
 * Engine priority (first success wins):
 *  1. Groq llama-4-scout-17b  (FREE, fast, vision-capable, existing key ✅)
 *  2. Gemini 2.0 Flash        (when quota available)
 *  3. HuggingFace BLIP+DETR   (always-free fallback, atob-free RN implementation)
 *
 * No GCP billing, no OpenAI billing, no new keys needed.
 * atob() removed — uses React Native compatible fetch(localFileUri) → blob.
 */
import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';

export interface ProductVisionResult {
  productName: string;
  category: string;
  expiryDate: string | null;
  allergens: string[];
  confidence: number;
  description: string;
}

const GROQ_KEY   = process.env.EXPO_PUBLIC_GROQ_API_KEY   || '';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const HF_KEY     = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || '';

const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_VISION_URL   = 'https://api.groq.com/openai/v1/chat/completions';

const GEMINI_MODELS  = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
const makeGeminiUrl  = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`;

const HF_BLIP  = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';
const HF_DETR  = 'https://api-inference.huggingface.co/models/facebook/detr-resnet-50';
const HF_TROCR = 'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed';

class CameraVisionServiceImpl {
  private readonly MOD = 'CAMERA_VISION';

  // ─── Read image as base64 (used for Gemini) ─────────────────────────────────
  private toBase64(path: string) {
    return FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
  }

  /**
   * Read local image file as a Blob using fetch() — no atob() needed.
   * React Native supports fetch() on file:// URIs natively.
   */
  private async toBlob(imagePath: string): Promise<Blob> {
    const response = await fetch(imagePath);
    return response.blob();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE 1 — Groq llama-4-scout (FREE, fast, always available)
  // ═══════════════════════════════════════════════════════════════════════════
  private async callGroqVision(imagePath: string, prompt: string): Promise<string> {
    if (!GROQ_KEY) throw new Error('No Groq key');

    // Read as base64 data URL — Groq Vision accepts data:image/jpeg;base64,...
    const base64 = await this.toBase64(imagePath);
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const body = {
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      max_tokens: 400,
      temperature: 0.2,
    };

    const res = await fetch(GROQ_VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      logger.warn(this.MOD, `Groq Vision ${res.status}: ${t.substring(0, 100)}`);
      throw new Error(`Groq Vision HTTP ${res.status}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Groq Vision empty response');
    logger.info(this.MOD, `Groq Vision OK (${text.length} chars)`);
    return text;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE 2 — Gemini (secondary, when quota available)
  // ═══════════════════════════════════════════════════════════════════════════
  private async callGemini(imagePath: string, prompt: string): Promise<string> {
    if (!GEMINI_KEY) throw new Error('No Gemini key');
    const base64 = await this.toBase64(imagePath);
    const body = {
      contents: [{ role: 'user', parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
      ]}],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    };
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(makeGeminiUrl(model), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!res.ok) { logger.warn(this.MOD, `Gemini/${model} ${res.status}`); continue; }
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } catch (e: any) { logger.warn(this.MOD, `Gemini/${model} threw: ${e.message}`); }
    }
    throw new Error('All Gemini models failed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE 3 — HuggingFace (always-free fallback, no atob)
  // ═══════════════════════════════════════════════════════════════════════════
  private async hfPost(url: string, imagePath: string): Promise<any> {
    // Use fetch() on the local file URI → Blob (no atob needed)
    const blob = await this.toBlob(imagePath);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/octet-stream' },
      body: blob,
    });
    if (!res.ok) { logger.warn(this.MOD, `HF ${url.split('/').pop()} ${res.status}`); return null; }
    return res.json();
  }

  private async hfCaption(imagePath: string): Promise<string> {
    try { const r = await this.hfPost(HF_BLIP, imagePath); return r?.[0]?.generated_text || ''; }
    catch { return ''; }
  }
  private async hfObjects(imagePath: string): Promise<{ label: string; score: number }[]> {
    try { const r = await this.hfPost(HF_DETR, imagePath); return Array.isArray(r) ? r.sort((a: any, b: any) => b.score - a.score) : []; }
    catch { return []; }
  }
  private async hfOCR(imagePath: string): Promise<string> {
    try { const r = await this.hfPost(HF_TROCR, imagePath); return r?.[0]?.generated_text || ''; }
    catch { return ''; }
  }

  private synthProduct(caption: string, objects: { label: string; score: number }[], ocrText: string): ProductVisionResult {
    const topObj   = objects[0]?.label || caption.split(' ').slice(0, 3).join(' ') || 'Unknown Item';
    const allTerms = [topObj, ...objects.slice(1, 4).map(o => o.label)].join(' ').toLowerCase();
    let category   = 'Other';
    if (/milk|dairy|cheese|yogurt|butter/.test(allTerms))  category = 'Dairy';
    else if (/bread|cake|biscuit|cookie/.test(allTerms))   category = 'Bakery';
    else if (/bottle|drink|juice|water|can|soda/.test(allTerms)) category = 'Beverages';
    else if (/fruit|vegetable|apple|banana|tomato/.test(allTerms)) category = 'Fruits & Vegetables';
    else if (/chicken|meat|beef|fish/.test(allTerms))      category = 'Meat & Seafood';
    else if (/chip|snack|chocolate|candy/.test(allTerms))  category = 'Snacks';

    const expiryMatch = ocrText.match(/(?:exp|best before|use by)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const allergens   = ['peanut','nut','milk','egg','wheat','gluten','soy','fish','shellfish','sesame']
      .filter(a => ocrText.toLowerCase().includes(a));
    return {
      productName: topObj, category, expiryDate: expiryMatch ? expiryMatch[1] : null,
      allergens, confidence: objects[0]?.score || 0.55,
      description: caption || `${topObj} camera mein nazar aya.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API — each method tries engines in order
  // ═══════════════════════════════════════════════════════════════════════════

  async analyzeProduct(imagePath: string): Promise<ProductVisionResult> {
    const prompt = `You are a product recognition AI for a visually impaired person in Pakistan.
Analyze this image. Identify: product name, category, expiry date, allergens.
Reply ONLY with this JSON (no markdown, no extra text):
{"productName":"exact name","category":"Dairy|Fruits & Vegetables|Meat & Seafood|Grains & Cereals|Beverages|Snacks|Condiments|Frozen Foods|Bakery|Personal Care|Other","expiryDate":"YYYY-MM-DD or null","allergens":[],"confidence":0.9,"description":"one Roman Urdu sentence describing this product"}
Give your best guess even if image is partially unclear. Never return empty productName.`;

    // 1. Groq Vision
    try {
      const raw   = await this.callGroqVision(imagePath, prompt);
      const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
      if (match) { const r = JSON.parse(match[0]) as ProductVisionResult; if (r.productName) return r; }
    } catch { logger.info(this.MOD, 'Groq Vision → Gemini fallback'); }

    // 2. Gemini
    try {
      const raw   = await this.callGemini(imagePath, prompt);
      const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
      if (match) { const r = JSON.parse(match[0]) as ProductVisionResult; if (r.productName) return r; }
    } catch { logger.info(this.MOD, 'Gemini → HF fallback'); }

    // 3. HuggingFace
    const [caption, objects, ocrText] = await Promise.all([
      this.hfCaption(imagePath), this.hfObjects(imagePath), this.hfOCR(imagePath),
    ]);
    return this.synthProduct(caption, objects, ocrText);
  }

  async describeScene(imagePath: string, mode: 'general' | 'walking' | 'danger' = 'general'): Promise<string> {
    const isNav = mode !== 'general';
    const prompt = isNav
      ? `You are guiding a blind person walking in Pakistan. Analyze this camera image NOW.
Is the path safe? Any obstacles, steps, holes, vehicles, walls, people blocking, wet floor?
Respond in ONE short Roman Urdu sentence. Be urgent if danger exists.
Safe example: "Rasta saaf hai, aage chal saktay hain."
Danger example: "RUKEIN! Aage ${mode === 'danger' ? 'khatara' : 'rukawat'} hai — sambhal kar."
NEVER say image is unclear. Always give your best assessment.`
      : `You are the eyes for a blind person in Pakistan. What is in front of the camera right now?
Describe objects, their positions, colors, any visible text. 1-2 sentences in Roman Urdu.
Example: "Aapke samne ek table hai jis par chai ka cup aur phone rakha hai."
NEVER say image is unclear.`;

    // 1. Groq Vision
    try { return await this.callGroqVision(imagePath, prompt); }
    catch { logger.info(this.MOD, 'Groq Vision scene → Gemini'); }

    // 2. Gemini
    try { return await this.callGemini(imagePath, prompt); }
    catch { logger.info(this.MOD, 'Gemini scene → HF'); }

    // 3. HF
    const [caption, objects] = await Promise.all([this.hfCaption(imagePath), this.hfObjects(imagePath)]);
    const items = [...objects.slice(0, 4).map(o => o.label)].filter(Boolean);
    if (isNav) {
      const dangerItems = ['car','vehicle','person','bicycle','motorcycle','stairs','door','pole','wall'];
      const hazard = items.find(i => dangerItems.some(d => i.toLowerCase().includes(d)));
      if (hazard) return `Sambhal kar! Aage ${hazard} nazar aa raha hai.`;
      return items.length > 0 ? `Rasta theek lagta hai. Camera mein: ${items.join(', ')}.` : 'Dheeray chalein, ahtiyat karein.';
    }
    return caption ? `Camera mein: ${caption}.` : items.length > 0 ? `Aapke samne: ${items.join(', ')}.` : 'Kuch saaf nazar nahi aya.';
  }

  async identifyColor(imagePath: string): Promise<string> {
    const prompt = `What is the primary color of the main object or clothing in this image?
Respond in one Roman Urdu sentence. Include both English and Urdu color names.
Example: "Yeh lal (red) rang ka hai." — Never say image is unclear.`;
    try { return await this.callGroqVision(imagePath, prompt); } catch {}
    try { return await this.callGemini(imagePath, prompt); } catch {}
    const caption = await this.hfCaption(imagePath);
    return caption ? `Camera mein: ${caption}.` : 'Rang identify karne mein masla aya.';
  }

  async recognizeText(imagePath: string): Promise<string> {
    const prompt = `Read ALL text visible in this image exactly as it appears. Include product names, labels, prices, dates, instructions. Return text line by line. If no text visible, say "Koi text nahi mila."`;
    try { return await this.callGroqVision(imagePath, prompt); } catch {}
    try { return await this.callGemini(imagePath, prompt); } catch {}
    const ocr = await this.hfOCR(imagePath);
    return ocr || 'Koi text nahi mila.';
  }

  async detectAllergensFromImage(imagePath: string): Promise<string[]> {
    const prompt = `Look at this food package. List all allergen warnings visible. Return ONLY a JSON array: ["peanuts","milk"]. Return [] if none visible.`;
    try {
      const raw = await this.callGroqVision(imagePath, prompt);
      const m = raw.match(/\[[\s\S]*?\]/); if (m) return JSON.parse(m[0]) as string[];
    } catch {}
    try {
      const raw = await this.callGemini(imagePath, prompt);
      const m = raw.match(/\[[\s\S]*?\]/); if (m) return JSON.parse(m[0]) as string[];
    } catch {}
    const ocrText = await this.hfOCR(imagePath);
    return ['peanut','nut','milk','egg','wheat','gluten','soy','fish','shellfish','sesame']
      .filter(a => ocrText.toLowerCase().includes(a));
  }

  async extractExpiryDate(imagePath: string): Promise<string | null> {
    const prompt = `Find the expiry or best-before date on this food package. Return ONLY the date in YYYY-MM-DD format, or exactly "null" if not found.`;
    try { const r = await this.callGroqVision(imagePath, prompt); const d = r.match(/\d{4}-\d{2}-\d{2}/); return d ? d[0] : null; } catch {}
    try { const r = await this.callGemini(imagePath, prompt);    const d = r.match(/\d{4}-\d{2}-\d{2}/); return d ? d[0] : null; } catch {}
    const ocr = await this.hfOCR(imagePath);
    const m = ocr.match(/(?:exp|best before|use by)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    return m ? m[1] : null;
  }

  isConfigured(): boolean { return !!(GROQ_KEY || GEMINI_KEY || HF_KEY); }
}

export const cameraVisionService = new CameraVisionServiceImpl();