/**
 * Voice Command Intents for Seevia.
 * Defines the core actions the voice assistant can perform.
 */
export enum VoiceCommandIntent {
  // Navigation & Core UI
  NAVIGATE_HOME = 'navigate_home',
  NAVIGATE_PANTRY = 'navigate_pantry',
  NAVIGATE_SHOPPING = 'navigate_shopping',
  NAVIGATE_EMERGENCY = 'navigate_emergency',
  NAVIGATE_SETTINGS = 'navigate_settings',
  GO_BACK = 'go_back',
  
  // Module 3: Pantry Management
  ADD_ITEM = 'add_item',
  REMOVE_ITEM = 'remove_item',
  VIEW_PANTRY = 'view_pantry',
  SCAN_BARCODE = 'scan_barcode',
  GENERATE_SHOPPING_LIST = 'generate_shopping_list',
  CHECK_EXPIRY = 'check_expiry', // Added for smart pantry analytics
  
  // Module 4: AI Vision Actions
  IDENTIFY_PRODUCT = 'identify_product',
  READ_TEXT = 'read_text',
  DESCRIBE_SCENE = 'describe_scene', // Added for low-vision assistance
  ADD_TO_PANTRY = 'add_to_pantry',
  ADD_TO_SHOPPING = 'add_to_shopping',
  
  // Module 6: Emergency Response
  ACTIVATE_SOS = 'activate_sos',
  CANCEL_SOS = 'cancel_sos',
  
  // General Interactions
  REPEAT = 'repeat',
  HELP = 'help',
  STOP = 'stop',
  UNKNOWN = 'unknown',
}

/**
 * The structured result of a parsed voice command.
 */
export interface VoiceCommand {
  intent: VoiceCommandIntent;
  confidence: number;
  entities?: Record<string, string>; // e.g., { itemName: 'milk', quantity: '2' }
  rawText: string;
  timestamp: number; // For command history/logging
  isWakeWord?: boolean; // True if "Hey Seevia" was detected
}

/**
 * Pattern definition for the NLU engine.
 */
export interface VoiceCommandPattern {
  intent: VoiceCommandIntent;
  patterns: string[]; // Regex strings or keywords
  requiresEntities?: string[]; // e.g., ['itemName'] for ADD_ITEM
}
