import { VoiceCommandIntent, VoiceCommandPattern } from '@/src/models/VoiceCommand';

/**
 * Seevia Comprehensive NLU Command Patterns.
 * Includes Multilingual support for Pakistan/UAE demographics.
 */
export const VOICE_COMMAND_PATTERNS: VoiceCommandPattern[] = [
  // --- CORE NAVIGATION ---
  {
    intent: VoiceCommandIntent.NAVIGATE_HOME,
    patterns: ['go home', 'dashboard', 'main screen', 'wapis chalo', 'shuruat'],
  },
  {
    intent: VoiceCommandIntent.NAVIGATE_PANTRY,
    patterns: ['open pantry', 'kitchen list', 'khana dikhao', 'pantry kholo'],
  },
  {
    intent: VoiceCommandIntent.NAVIGATE_SHOPPING,
    patterns: ['go shopping', 'store guide', 'sauda list', 'save mart chalo'],
  },
  {
    intent: VoiceCommandIntent.NAVIGATE_EMERGENCY,
    patterns: ['emergency menu', 'safety settings', 'hifazat'],
  },
  {
    intent: VoiceCommandIntent.GO_BACK,
    patterns: ['go back', 'back', 'piche jao'],
  },

  // --- MODULE 3: PANTRY MANAGEMENT ---
  {
    intent: VoiceCommandIntent.ADD_ITEM,
    patterns: [
      'add (.+)', 
      'put (.+) in pantry', 
      '(.+) rakh do', 
      'new item (.+)'
    ],
    requiresEntities: ['itemName'],
  },
  {
    intent: VoiceCommandIntent.REMOVE_ITEM,
    patterns: [
      'remove (.+)', 
      'delete (.+)', 
      '(.+) khatam ho gaya', 
      '(.+) nikaal do'
    ],
    requiresEntities: ['itemName'],
  },
  {
    intent: VoiceCommandIntent.CHECK_EXPIRY,
    patterns: ['what is expiring', 'expiry check', 'khana kharab to nahi'],
  },

  // --- MODULE 4: AI VISION ---
  {
    intent: VoiceCommandIntent.IDENTIFY_PRODUCT,
    patterns: ['what is this', 'identify', 'samne kya hai', 'pehchano'],
  },
  {
    intent: VoiceCommandIntent.READ_TEXT,
    patterns: ['read this', 'what does it say', 'parh kar batao', 'read label'],
  },
  {
    intent: VoiceCommandIntent.DESCRIBE_SCENE,
    patterns: ['describe room', 'where am i', 'mahaul kaisa hai'],
  },

  // --- MODULE 5: SMART SHOPPING ---
  {
    intent: VoiceCommandIntent.FIND_AISLE,
    patterns: ['where is (.+)', 'find (.+)', '(.+) kahan hai'],
    requiresEntities: ['itemName'],
  },
  {
    intent: VoiceCommandIntent.GET_DIRECTIONS,
    patterns: ['take me there', 'start navigation', 'rasta batao'],
  },

  // --- MODULE 6: EMERGENCY SOS (Critical) ---
  {
    intent: VoiceCommandIntent.ACTIVATE_SOS,
    patterns: [
      'help me', 
      'emergency', 
      'sos', 
      'bachao', 
      'madad karo', 
      'call for help'
    ],
  },

  // --- SYSTEM UTILITIES ---
  {
    intent: VoiceCommandIntent.REPEAT,
    patterns: ['repeat', 'say again', 'dobara bolo'],
  },
  {
    intent: VoiceCommandIntent.STOP,
    patterns: ['stop', 'shutup', 'bas karo', 'khamosh'],
  },
];

export const WAKE_WORDS = ['hey seevia', 'ok seevia', 'hello seevia', 'suno seevia'];
