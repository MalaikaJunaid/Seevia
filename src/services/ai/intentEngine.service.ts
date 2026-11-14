/**
 * Seevia Intent Engine
 * Uses TensorFlow.js to classify bilingual voice commands.
 */

import * as tf from '@tensorflow/tfjs';
import { modelLoaderService } from './modelLoader.service';
import { VoiceCommandsService } from '../voice/voiceCommands.service';
import { VoiceCommandIntent } from '@/models/voiceCommand';
import { hapticService } from '../common/haptic.service';
import { logger } from '@/utils/logger';

interface IntentPrediction {
  label: VoiceCommandIntent;
  confidence: number;
}

class IntentEngineService {
  private readonly MODULE = 'INTENT_ENGINE';
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  async classify(text: string): Promise<VoiceCommandIntent> {
    try {
      await hapticService.selection();
      logger.info(this.MODULE, `Classifying text: "${text}"`);

      // 1. Try Deterministic Regex first for speed
      const regexResult = VoiceCommandsService.parseCommand(text);
      if (regexResult.intent !== VoiceCommandIntent.UNKNOWN) {
        await hapticService.success();
        return regexResult.intent;
      }

      // 2. Fallback to TFJS ML Inference for complex queries
      const model = modelLoaderService.getModel('intent_engine');
      if (!model) {
        logger.warn(this.MODULE, 'ML Model not loaded, using fallback only.');
        return VoiceCommandIntent.UNKNOWN;
      }

      const prediction = await this.runInference(model, text);
      
      if (prediction.confidence > this.CONFIDENCE_THRESHOLD) {
        await hapticService.success();
        return prediction.label;
      }

      return VoiceCommandIntent.UNKNOWN;
    } catch (error) {
      logger.error(this.MODULE, 'Inference failed', error);
      return VoiceCommandIntent.UNKNOWN;
    }
  }

  private async runInference(model: tf.LayersModel, text: string): Promise<IntentPrediction> {
    // Tokenize text - convert to fixed-length numerical array
    const input = this.preprocess(text);
    
    const inputTensor = tf.tensor2d([input], [1, 10]); 
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const data = await prediction.data();
    
    // Find highest confidence intent
    let maxIdx = 0;
    let maxVal = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
        maxIdx = i;
      }
    }
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Map index to intent (simplified - customize based on your model)
    const intents = [
      VoiceCommandIntent.ADD_ITEM,
      VoiceCommandIntent.VIEW_PANTRY,
      VoiceCommandIntent.ACTIVATE_SOS,
      VoiceCommandIntent.UNKNOWN,
    ];
    
    return {
      label: intents[maxIdx] || VoiceCommandIntent.UNKNOWN,
      confidence: maxVal,
    };
  }

  private preprocess(text: string): number[] {
    // Simple tokenization: convert text characters to numerical values
    // Pad/truncate to fixed length 10
    const chars = text.toLowerCase().split('').slice(0, 10);
    const tokenized = chars.map(c => c.charCodeAt(0) / 127);
    while (tokenized.length < 10) tokenized.push(0);
    return tokenized;
  }

  async initialize(): Promise<void> {
    await modelLoaderService.init();
  }
}

export const intentEngineService = new IntentEngineService();
