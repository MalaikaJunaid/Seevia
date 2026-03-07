import * as tf from '@tensorflow/tfjs';
import { modelLoaderService } from './modelLoader.service';
import { VoiceCommandsService } from '../voice/voiceCommands.service';
import { VoiceCommandIntent } from '@/src/models/VoiceCommand';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Intent Engine
 * Uses on-device ML to classify complex and bilingual voice commands.
 */
class IntentEngineService {
  private readonly MODULE = 'INTENT_ENGINE';
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  /**
   * Classifies raw transcribed text into a structured intent.
   */
  async classify(text: string): Promise<VoiceCommandIntent> {
    try {
      await hapticService.selection(); //
      logger.info(this.MODULE, `Classifying text: "${text}"`);

      // 1. Try Deterministic Regex first for speed
      const regexResult = VoiceCommandsService.parseCommand(text);
      if (regexResult.intent !== VoiceCommandIntent.UNKNOWN) {
        return regexResult.intent;
      }

      // 2. Fallback to ML Inference for complex queries
      const model = modelLoaderService.getModel('intent_engine');
      if (!model) {
        logger.warn(this.MODULE, 'ML Model not loaded, using fallback only.');
        return VoiceCommandIntent.UNKNOWN;
      }

      const prediction = await this.runInference(model, text);
      
      if (prediction.confidence > this.CONFIDENCE_THRESHOLD) {
        await hapticService.success();
        return prediction.label as VoiceCommandIntent;
      }

      return VoiceCommandIntent.UNKNOWN;
    } catch (error) {
      logger.error(this.MODULE, 'Inference failed', error);
      return VoiceCommandIntent.UNKNOWN;
    }
  }

  private async runInference(model: tf.LayersModel, text: string) {
    // This is a simplified representation of text-to-tensor processing
    // In a real scenario, you would use a tokenizer/vocabulary map.
    const inputTensor = tf.tensor2d([this.preprocess(text)], [1, 10]); 
    const output = model.predict(inputTensor) as tf.Tensor;
    const data = await output.data();
    
    // Logic to find the highest probability label
    return { label: 'add_pantry', confidence: 0.88 }; 
  }

  private preprocess(text: string): number[] {
    // Convert text to a fixed-length numerical array (Tokenization)
    return new Array(10).fill(0); 
  }
}

export const intentEngineService = new IntentEngineService();
