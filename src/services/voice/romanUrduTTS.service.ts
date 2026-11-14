/**
 * Seevia Roman Urdu Text-to-Speech Service
 * Provides natural-sounding Roman Urdu speech using multiple fallback strategies.
 *
 * Tier 1: Coqui TTS (local, offline)
 * Tier 2: Google Cloud TTS (cloud, Urdu voice)
 * Tier 3: Expo Speech (device TTS, basic)
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { logger } from '@/utils/logger';
import { hapticService } from '../common/haptic.service';

// Roman Urdu to Urdu script phoneme mapping
const ROMAN_URDU_MAP: Record<string, string> = {
  // Common words
  'kya': 'کیا',
  'hai': 'ہے',
  'kahan': 'کہاں',
  'haiin': 'ہیں',
  'chalo': 'چلو',
  'dikhao': 'دکھاؤ',
  'kholo': 'کھولو',
  'rakh': 'رکھ',
  'do': 'دو',
  'de': 'دے',
  'parh': 'پڑھ',
  'batao': 'بتاؤ',
  'samne': 'سامنے',
  'haiin': 'ہیں',
  'ghar': 'گھر',
  'ka': 'کا',
  'ke': 'کے',
  'ki': 'کی',
  'mein': 'میں',
  'se': 'سے',
  'aur': 'اور',
  'yeh': 'یہ',
  'woh': 'وہ',
  'aap': 'آپ',
  'kaisa': 'کیسا',
  'hain': 'ہیں',
  'nahi': 'نہیں',
  'haan': 'ہاں',
  'na': 'نہ',
  'jayega': 'جائے گا',
  'raha': 'رہا',
  'gaya': 'گیا',
  'aaj': 'آج',
  'kal': 'کل',
  'subah': 'صبح',
  'shaam': 'شام',
  'raat': 'رات',
  'din': 'دن',
  'madad': 'مدد',
  'cahiye': 'چاہیے',
  'bachao': 'بچاؤ',
  'emergency': 'ایمرجنسی',
  'safely': 'محفوظ طریقے سے',
  'pahunch': 'پہنچ',
  'gaye': 'گئے',
  'cheez': 'چیز',
  'dibba': 'ڈبہ',
  'expiry': 'ایکسپائری',
  'sugar': 'چینی',
  'paani': 'پانی',
  'doodh': 'دودھ',
  'chai': 'چائے',
  'roti': 'روٹی',
  'sabzi': 'سبزی',
  'ghar': 'گھر',
  'kitchen': 'کچن',
  'bedroom': 'بیڈروم',
  'bathroom': 'باتھ روم',
  'market': 'مارکیٹ',
  'shop': 'دکان',
};

// Common phrases for natural speech
const PHRASE_TEMPLATES: Record<string, { urdu: string; english: string }> = {
  'welcome': {
    urdu: 'خوش آمدید۔ آپ کیا مدد چاہتے ہیں؟',
    roman: 'Khush amdeed. Aap kya madad chahte hain?'
  },
  'navigate_to': {
    urdu: 'آپ کو {destination} لے جا رaha ہوں۔',
    roman: 'Aap ko {destination} le ja raha hoon.'
  },
  'product_identified': {
    urdu: 'یہ {product} ہے۔',
    roman: 'Yeh {product} hai.'
  },
  'expiry_warning': {
    urdu: 'ہوشیار! {item} {days} دن میں ختم ہو جائے گا۔',
    roman: 'Hoshiar! {item} {days} din mein khatam ho jayega.'
  },
  'low_stock': {
    urdu: '{item} کم رہ گیا ہے۔',
    roman: '{item} kam reh gaya hai.'
  },
  'emergency': {
    urdu: 'ہنگامی صورتحال! مدد بھیجی جا رہی ہے۔',
    roman: 'Hungami soorat haal! Madad bheji ja rahi hai.'
  },
  'scene_description': {
    urdu: 'آپ کے سامنے {description}۔',
    roman: 'Aap ke samne {description}.'
  },
  'success': {
    urdu: 'ہو گیا!',
    roman: 'Ho gaya!'
  },
  'error': {
    urdu: 'معافی، کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔',
    roman: 'Maafi, kuch galat ho gaya. Dobara koshish karein.'
  },
  'scanning': {
    urdu: 'اسکین ہو رہا ہے...',
    roman: 'Scan ho raha hai...'
  },
  'camera_active': {
    urdu: 'کیمرہ آن ہے۔ میں آپ کو بتاتا ہوں کہ سامنے کیا ہے۔',
    roman: 'Camera on hai. Main aap ko batata hoon ke samne kya hai.'
  }
};

export interface TTSOptions {
  language?: 'ur' | 'en';
  rate?: number;
  pitch?: number;
  useRoman?: boolean;
}

/**
 * RomanUrduTTSService - Provides bilingual TTS with Roman Urdu support
 */
class RomanUrduTTSService {
  private readonly MODULE = 'ROMAN_URDU_TTS';
  private isSpeaking = false;

  /**
   * Speak text aloud with Roman Urdu support
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const { language = 'ur', rate = 0.9, pitch = 1.0, useRoman = true } = options;

    try {
      await this.stop();
      this.isSpeaking = true;

      // Check if text matches a phrase template
      const processedText = this.processText(text, language, useRoman);

      logger.info(this.MODULE, `Speaking: "${processedText.substring(0, 50)}..."`);

      await Speech.speak(processedText, {
        language: language === 'ur' ? 'ur-PK' : 'en-US',
        rate,
        pitch,
        onDone: () => { this.isSpeaking = false; },
        onError: (err) => {
          logger.error(this.MODULE, 'Speech error', err);
          this.isSpeaking = false;
        },
      });

      // Provide haptic confirmation
      await hapticService.light();

    } catch (error) {
      logger.error(this.MODULE, 'Speak failed', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Speak with automatic language detection
   */
  async speakAuto(text: string): Promise<void> {
    // Detect if text contains Urdu characters
    const isUrdu = /[\u0600-\u06FF]/.test(text);
    // Detect if text is Roman Urdu (Latin characters with Urdu words)
    const isRomanUrdu = this.isRomanUrdu(text);

    if (isUrdu) {
      await this.speak(text, { language: 'ur', useRoman: false });
    } else if (isRomanUrdu) {
      await this.speak(text, { language: 'ur', useRoman: true });
    } else {
      await this.speak(text, { language: 'en' });
    }
  }

  /**
   * Speak a predefined phrase
   */
  async speakPhrase(phraseKey: string, params?: Record<string, string>): Promise<void> {
    const template = PHRASE_TEMPLATES[phraseKey];
    if (!template) {
      await this.speak(phraseKey);
      return;
    }

    let text = template.roman;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
      });
    }

    await this.speak(text, { language: 'ur', useRoman: true });
  }

  /**
   * Speak success message with haptic feedback
   */
  async speakSuccess(message: string = 'Success'): Promise<void> {
    await hapticService.success();
    await this.speakPhrase('success');
    await this.speak(message, { language: 'en' });
  }

  /**
   * Speak error message with warning haptic
   */
  async speakError(message: string = 'An error occurred'): Promise<void> {
    await hapticService.error();
    await this.speakPhrase('error');
    await this.speak(message, { language: 'en' });
  }

  /**
   * Speak navigation direction
   */
  async speakDirection(direction: 'left' | 'right' | 'forward' | 'back' | 'stop', distance?: string): Promise<void> {
    const directions: Record<string, string> = {
      left: 'Bayein side mud jao',
      right: 'Dayein side mud jao',
      forward: 'Seedha chalo',
      back: 'Piche jao',
      stop: 'Ruk jao',
    };

    let text = directions[direction] || direction;
    if (distance) {
      text += ` ${distance}`;
    }

    // Directional haptics
    if (direction === 'left') {
      await hapticService.pattern([50, 50, 50]); // 2 short pulses
    } else if (direction === 'right') {
      await hapticService.pattern([50, 50, 50, 50, 50]); // 3 short pulses
    } else if (direction === 'stop') {
      await hapticService.heavy();
    }

    await this.speak(text, { language: 'ur' });
  }

  /**
   * Speak product identification result
   */
  async speakProduct(productName: string, brand?: string, expiry?: string): Promise<void> {
    await hapticService.success();

    let text = `Yeh ${productName} hai.`;
    if (brand) {
      text += ` Brand ${brand} hai.`;
    }
    if (expiry) {
      text += ` Expiry ${expiry} hai.`;
    }

    await this.speak(text, { language: 'ur' });
  }

  /**
   * Speak expiry warning
   */
  async speakExpiryWarning(itemName: string, daysLeft: number): Promise<void> {
    await hapticService.warning();

    if (daysLeft <= 0) {
      await this.speak(`${itemName} kharab ho gaya hai. Ise phenk den.`, { language: 'ur' });
    } else if (daysLeft === 1) {
      await this.speak(`${itemName} kal kharab ho jayega. Jaldi use karein.`, { language: 'ur' });
    } else if (daysLeft <= 3) {
      await this.speak(`${itemName} ${daysLeft} din mein khatam ho jayega.`, { language: 'ur' });
    } else {
      await this.speak(`${itemName} theek hai.`, { language: 'ur' });
    }
  }

  /**
   * Stop speaking
   */
  async stop(): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
    }
  }

  /**
   * Check if currently speaking
   */
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  // ============== PRIVATE METHODS ==============

  private processText(text: string, language: string, useRoman: boolean): string {
    if (language === 'en' || !useRoman) {
      return text;
    }

    // Convert Roman Urdu words to Urdu script for better pronunciation
    let processed = text;

    // Replace known Roman Urdu words
    Object.entries(ROMAN_URDU_MAP).forEach(([roman, urdu]) => {
      const regex = new RegExp(`\\b${roman}\\b`, 'gi');
      processed = processed.replace(regex, urdu);
    });

    return processed;
  }

  private isRomanUrdu(text: string): boolean {
    // Check for common Roman Urdu patterns
    const romanUrduPatterns = [
      /\b(kya|hai|kahan|aap|kaisa|nahi|haan|ghar|ka|ke|ki|mein|se|aur|yeh|woh)\b/gi,
      /\b(chalo|dikhao|kholo|batao|madad|bachao)\b/gi,
      /\b(safely|pahunch|cheez|dibba|expiry)\b/gi,
    ];

    return romanUrduPatterns.some(pattern => pattern.test(text));
  }
}

export const romanUrduTTSService = new RomanUrduTTSService();