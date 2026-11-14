import { router } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';

import { groqSTTService as sttService } from './groqWhisperSTT.service';
import IntentEngineService, { IntentResult } from './intentEngine.service';
import { hapticService } from '../common/haptic.service';
import { logger } from '@/utils/logger';

// Services for Conversational AI context
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { TextToSpeechService } from './textToSpeech.service';

class VoiceCommandsOrchestrator {
  private static readonly MODULE = 'VOICE_ORCHESTRATOR';
  
  private isProcessingCommand: boolean = false;
  private isRecordingActive: boolean = false;
  private currentPath: string = '';
  private pendingConfirmation: IntentResult | null = null;
  
  // 🛠️ NEW: Conversational Memory for missing details (like quantity)
  private pendingContext: { intent: string, itemName: string } | null = null;

  // 🚨 DEMO-ONLY: State to keep the background brute-force loop alive
  private isDemoListeningActive: boolean = false;

  setCurrentPath(path: string | null | undefined) {
    const safePath = path ?? 'initial_load';
    this.currentPath = safePath;
    logger.info(VoiceCommandsOrchestrator.MODULE, `Context updated. User is now on: ${safePath}`);
  }

  // 🚨 DEMO-ONLY: Start the continuous 3-second listening loop
  async startBackgroundListening() {
    if (this.isDemoListeningActive) return;
    this.isDemoListeningActive = true;
    logger.info(VoiceCommandsOrchestrator.MODULE, '🚨 DEMO MODE: Brute-force background listening started!');
    this.runDemoListenLoop();
  }

  // 🚨 DEMO-ONLY: Pause the background loop so the main mic can take over
  async stopBackgroundListening() {
    this.isDemoListeningActive = false;
    logger.info(VoiceCommandsOrchestrator.MODULE, '🚨 DEMO MODE: Background listening paused.');
  }

  // 🚨 DEMO-ONLY: The actual loop engine
  private async runDemoListenLoop() {
    while (this.isDemoListeningActive) {
      try {
        // GUARD: never start a new recording if the mic is already in use
        if (sttService.busy) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Listen silently in 3-second chunks
        const sttResult = await sttService.listenForCommand(3000);

        if (sttResult.success && sttResult.text) {
          const transcript = sttResult.text.toLowerCase().trim();
          if (transcript.length > 0) {
            logger.info(VoiceCommandsOrchestrator.MODULE, `[Background Detect]: "${transcript}"`);
          }

          if (
            transcript.includes('hey') ||
            transcript.includes('seevia') ||
            transcript.includes('cv') ||
            transcript.includes('c v')
          ) {
            logger.info(VoiceCommandsOrchestrator.MODULE, '🎯 Wake word detected in background loop!');
            this.isDemoListeningActive = false; // stop loop before triggering
            await this.triggerManualCommand();
            return; // exit entirely — triggerManualCommand will restart loop when done
          }
        }
      } catch {
        // Silently ignore errors in the background loop
      }

      // Wait 1.5s between background chunks to avoid mic thrashing
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  async triggerManualCommand() {
    DeviceEventEmitter.emit('MIC_MANUALLY_TRIGGERED');

    if (TextToSpeechService.stop) {
      await TextToSpeechService.stop();
    }

    if (this.isProcessingCommand || this.isRecordingActive) {
      logger.info(VoiceCommandsOrchestrator.MODULE, 'Already listening. Ignoring trigger.');
      return;
    }

    // Stop background loop AND cancel any in-progress background recording
    await this.stopBackgroundListening();
    sttService.cancelRecording(); // release mic immediately
    await new Promise(resolve => setTimeout(resolve, 200)); // short settle

    logger.info(VoiceCommandsOrchestrator.MODULE, 'Command triggered. Main mic taking over.');
    await this.processActiveCommand();
  }

  private async processActiveCommand() {
    this.isProcessingCommand = true;
    this.isRecordingActive = false;

    try {
      await hapticService.trigger('success');
      
      if (!this.pendingConfirmation && !this.pendingContext) {
        await TextToSpeechService.speak('Ji, batayen?');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      this.isRecordingActive = true;
      logger.info(VoiceCommandsOrchestrator.MODULE, '🎤 Recording command via Whisper...');
      
      const sttResult = await sttService.listenForCommand(8000);
      this.isRecordingActive = false;

      if (!sttResult.success || !sttResult.text || sttResult.text.trim() === '') {
        await TextToSpeechService.speak('Maazrat, mujhe awaz nahi aayi. Dobara koshish karen.');
        return;
      }

      const transcript = sttResult.text.toLowerCase();
      logger.info(VoiceCommandsOrchestrator.MODULE, `Whisper Transcript: "${transcript}"`);

      // 🛑 Pending Confirmation Intercept
      if (this.pendingConfirmation) {
        const isYes = transcript.includes('yes') || transcript.includes('haan') || transcript.includes('jee') || transcript.includes('ji');
        const isNo = transcript.includes('no') || transcript.includes('nahi') || transcript.includes('na') || transcript.includes('cancel');

        if (isYes) {
          const confirmedAction = this.pendingConfirmation;
          this.pendingConfirmation = null; 
          await this.executeConfirmedAction(confirmedAction);
          return;
        } else if (isNo) {
          this.pendingConfirmation = null; 
          await TextToSpeechService.speak('Theek hai, action cancel kar diya gaya hai.');
          return;
        } else {
          await TextToSpeechService.speak('Mujhe samajh nahi aya. Bara-e-meharbani Haan ya Na mein jawab dein.');
          return;
        }
      }

      // 🛑 Missing Quantity Conversational Intercept
      if (this.pendingContext && this.pendingContext.intent === 'add_item_qty') {
        const numberMatch = transcript.match(/\d+/);
        let qty = numberMatch ? numberMatch[0] : '1'; 
        
        if (transcript.includes('ek') || transcript.includes('aik')) qty = '1';
        if (transcript.includes('do')) qty = '2';
        if (transcript.includes('teen')) qty = '3';
        if (transcript.includes('char')) qty = '4';
        if (transcript.includes('panch')) qty = '5';

        const itemName = this.pendingContext.itemName;
        this.pendingContext = null; // Clear memory

        await TextToSpeechService.speak(`Theek hai, ${qty} ${itemName} add kar rahi hoon. Expiry date note karne ke liye camera open kar rahi hoon.`);
        
        router.push({ pathname: '/add-item', params: { itemName: itemName, quantity: qty } });
        // Automatically open scanner to check expiry date after navigating to add item
        setTimeout(() => DeviceEventEmitter.emit('VOICE_TRIGGER_SCAN'), 2500);
        return;
      }

      // 🛑 Onboarding Guard
      if (this.currentPath.includes('onboarding')) {
        if (transcript.includes('hey') || transcript.includes('seevia') || transcript.includes('cv') || transcript.includes('c v')) {
          await TextToSpeechService.speak('Voice calibration successful!');
          DeviceEventEmitter.emit('VOICE_CALIBRATION_SUCCESS');
        } else {
          await TextToSpeechService.speak('Awaaz samajh nahi aayi, dobara koshish karein.');
        }
        return; 
      }

      // 🧠 Normal Flow
      const command = await IntentEngineService.classify(sttResult.text);

      if (command.intent === 'unknown' || command.confidence < 0.45) {
        // Try treating low-confidence as open question to AI
        await TextToSpeechService.speak('Jee, main soch rahi hoon...');
        try {
          const user = AuthService.getCurrentUser();
          let pantryItemNames: string[] = [];
          if (user) {
            const items = await PantryService.getPantryItems(user.uid);
            pantryItemNames = items.map((item: any) => item.name);
          }
          const aiResponse = await IntentEngineService.generateConversationalResponse(transcript, pantryItemNames);
          await TextToSpeechService.speak(aiResponse);
        } catch {
          await TextToSpeechService.speak('Main samajh nahi payi. Dobara bolein.');
        }
        return;
      }

      await this.executeAndAcknowledge(command, sttResult);

    } catch (error) {
      this.isRecordingActive = false;
      this.pendingConfirmation = null;
      this.pendingContext = null;
      logger.error(VoiceCommandsOrchestrator.MODULE, 'Pipeline failed', error);
      await TextToSpeechService.speak('Network ka masla hai, please internet check karen.');
    } finally {
      this.isProcessingCommand = false;
      logger.info(VoiceCommandsOrchestrator.MODULE, 'Command processing finished.');

      // ⏳ CRITICAL: Wait for TTS to finish playing before opening the mic again.
      // Without this delay, the background listener picks up Seevia's own speaker
      // output and re-processes it as a user command (echo loop).
      // 2.5s covers most short TTS responses; longer ones will still be clipped
      // but at least the first re-trigger is prevented.
      await new Promise(resolve => setTimeout(resolve, 2500));
      await this.startBackgroundListening();
    }
  }

  private async executeAndAcknowledge(command: IntentResult, sttResult?: { success: boolean; text: string }) {
    const { intent, entities } = command;
    const safePath = this.currentPath || 'unknown';
    
    logger.info(VoiceCommandsOrchestrator.MODULE, `Executing [${intent}]`);

    switch (intent) {
      case 'add_item':
        const addName = entities.product || entities.item || entities.itemName || '';
        const rawQty = entities.quantity || entities.number || '';

        if (addName && !rawQty) {
          // 🛠️ AI knows the item, but missing the quantity
          this.pendingContext = { intent: 'add_item_qty', itemName: addName };
          await TextToSpeechService.speak(`Main ${addName} add kar rahi hoon. Kitne adad ya quantity save karun?`);
        } else if (addName && rawQty) {
          // 🛠️ AI has both item and quantity
          await TextToSpeechService.speak(`${rawQty} ${addName} pantry mein add kar rahi hoon. Expiry check karne ke liye camera khol rahi hoon.`);
          router.push({ pathname: '/add-item', params: { itemName: addName, quantity: rawQty } });
          // Automatically open scanner to check expiry date
          setTimeout(() => DeviceEventEmitter.emit('VOICE_TRIGGER_SCAN'), 2500);
        } else {
          // AI missed the name entirely
          await TextToSpeechService.speak('Kya add karna hai? Add-item screen khol rahi hoon.');
          router.push('/add-item');
        }
        break;

      case 'remove_item':
        const removeName = entities.product || entities.item || entities.itemName || '';
        await TextToSpeechService.speak(removeName ? `${removeName} remove kar rahi hoon.` : 'Kaunsa item remove karein?');
        DeviceEventEmitter.emit('VOICE_REMOVE_ITEM', { name: removeName });
        if (!safePath.includes('pantry')) router.push('/(tabs)/pantry');
        break;

      case 'update_pantry':
        await TextToSpeechService.speak('Pantry update kar rahi hoon.');
        DeviceEventEmitter.emit('VOICE_UPDATE_PANTRY', entities);
        if (!safePath.includes('pantry') && !safePath.includes('add-item')) router.push('/(tabs)/pantry');
        break;

      case 'check_stock':
        await TextToSpeechService.speak("Stock check kar rahi hoon...");
        DeviceEventEmitter.emit('TRIGGER_LOW_STOCK_CHECK');
        setTimeout(() => router.push('/(tabs)/shopping'), 3000);
        break;

      case 'check_expiry':
        await TextToSpeechService.speak("Expiry dates check kar rahi hoon.");
        DeviceEventEmitter.emit('TRIGGER_EXPIRY_CHECK');
        setTimeout(() => {
          router.push('/(tabs)/pantry');
          setTimeout(() => DeviceEventEmitter.emit('SHOW_EXPIRED_FILTER'), 500);
        }, 3000);
        break;

      case 'show_shopping_list':
        await TextToSpeechService.speak("Shopping list khol rahi hoon.");
        router.push('/(tabs)/shopping');
        break;

      case 'shop_from_list':
        await TextToSpeechService.speak("Guided shopping mode shuru kar rahi hoon.");
        DeviceEventEmitter.emit('START_GUIDED_SHOPPING');
        break;

      case 'check_allergen':
        await TextToSpeechService.speak("Ingredients check kar rahi hoon. Ek second.");
        DeviceEventEmitter.emit('TRIGGER_ALLERGEN_SCAN', entities.product);
        break;

      case 'update_medication':
        await TextToSpeechService.speak("Medication tracker khol raha hoon.");
        DeviceEventEmitter.emit('VOICE_UPDATE_MEDICATION');
        router.push('/(tabs)/settings');
        break;

      case 'check_medication_reminder':
        await TextToSpeechService.speak("Dawai ka status check kar raha hoon...");
        DeviceEventEmitter.emit('VOICE_CHECK_MEDICATION');
        router.push('/(tabs)/settings');
        break;

      case 'navigate_external':
        const dest = entities.location || entities.destination || '';
        if (dest) {
          await TextToSpeechService.speak(`${dest} ka rasta dhoondhta hoon. Navigation khol raha hoon.`);
          router.push({ pathname: '/store-navigation', params: { target: dest, mode: 'outdoor' } });
        } else {
          await TextToSpeechService.speak('Kahan jaana hai? Navigation screen khol raha hoon.');
          router.push('/store-navigation');
        }
        break;

      case 'navigate_internal':
      case 'find_product':
        const target = entities.product || entities.location || 'Aage';
        await TextToSpeechService.speak(`${target} dhoondh rahi hoon. Store navigation khol rahi hoon.`);
        router.push({ pathname: '/store-navigation', params: { target } });
        DeviceEventEmitter.emit('START_INDOOR_NAV', target);
        break;

      case 'identify_product':
      case 'describe_scene':
        await TextToSpeechService.speak("Camera on hai, samne rakhein.");
        if (!safePath.includes('scanner')) {
          router.push('/scanner');
          setTimeout(() => DeviceEventEmitter.emit('VOICE_TRIGGER_SCAN'), 1500);
        } else {
          DeviceEventEmitter.emit('VOICE_TRIGGER_SCAN');
        }
        break;

      case 'identify_color':
        await TextToSpeechService.speak("Dress ka color analyze kar rahi hoon.");
        if (!safePath.includes('scanner')) {
          router.push('/scanner');
          setTimeout(() => DeviceEventEmitter.emit('TRIGGER_COLOR_DETECTION'), 1500);
        } else {
          DeviceEventEmitter.emit('TRIGGER_COLOR_DETECTION');
        }
        break;

      case 'detect_danger':
        await TextToSpeechService.speak('Walking safety mode on. Camera se rasta check karti hoon.');
        router.push({ pathname: '/store-navigation', params: { mode: 'walking' } });
        break;

      case 'emergency_sos':
        await TextToSpeechService.speak('Emergency! Madad aa rahi hai.');
        router.push('/(tabs)/emergency');
        setTimeout(() => DeviceEventEmitter.emit('VOICE_SOS'), 800);
        break;

      case 'theek_hoon':
      case 'cancel_sos':
        // User says "Theek hoon" to cancel a fall alert
        DeviceEventEmitter.emit('VOICE_CANCEL_FALL');
        await TextToSpeechService.speak('Acha. Khyal rakhein. Main yahan hoon.');
        break;

      case 'walking_mode':
      case 'start_walking':
        await TextToSpeechService.speak('Walking mode shuru. Camera se rasta dekh rahi hoon.');
        router.push({ pathname: '/store-navigation', params: { mode: 'walking' } });
        break;

      case 'call_caregiver':
        this.pendingConfirmation = command;
        await TextToSpeechService.speak("Kya aap waqayi caretaker ko call milana chahte hain? Haan ya Na?");
        break;

      case 'call_volunteer':
        this.pendingConfirmation = command;
        await TextToSpeechService.speak("Kya aap waqayi kisi volunteer se connect karna chahte hain? Haan ya Na?");
        break;

      case 'logout':
        this.pendingConfirmation = command;
        await TextToSpeechService.speak("Kya aap waqayi log out karna chahte hain? Haan ya Na?");
        break;

      case 'set_haptics':
        DeviceEventEmitter.emit('TOGGLE_HAPTICS');
        break;

      case 'ask_ai':
        // Use full transcript for best AI response — entities.query may be truncated
        const query = sttResult?.text || entities.query || '';
        await TextToSpeechService.speak('Jee, main soch rahi hoon...');
        
        try {
          const user = AuthService.getCurrentUser();
          let pantryItemNames: string[] = [];
          
          if (user) {
            const items = await PantryService.getPantryItems(user.uid);
            pantryItemNames = items.map((item: any) => item.name);
          }

          const aiResponse = await IntentEngineService.generateConversationalResponse(query, pantryItemNames);
          await TextToSpeechService.speak(aiResponse);
        } catch (error) {
          logger.error(VoiceCommandsOrchestrator.MODULE, 'Conversational AI failed', error);
          await TextToSpeechService.speak('Network thoda slow hai, main abhi jawab nahi de paa rahi.');
        }
        break;

      default:
        await TextToSpeechService.speak('Main samajh nahi payi. Dobara try karein.');
        break;
    }
  }

  private async executeConfirmedAction(command: IntentResult) {
    logger.info(VoiceCommandsOrchestrator.MODULE, `User confirmed execution of [${command.intent}]`);

    switch(command.intent) {
      case 'call_caregiver':
        await TextToSpeechService.speak("Caretaker ko call mila rahi hoon.");
        DeviceEventEmitter.emit('CALL_CAREGIVER');
        break;
      case 'call_volunteer':
        await TextToSpeechService.speak("Volunteer network se connect kar rahi hoon.");
        DeviceEventEmitter.emit('CALL_VOLUNTEER');
        break;
      case 'logout':
        await TextToSpeechService.speak("Log out kar rahi hoon. Khuda Hafiz.");
        DeviceEventEmitter.emit('TRIGGER_LOGOUT');
        break;
    }
  }
}

export const voiceOrchestrator = new VoiceCommandsOrchestrator();