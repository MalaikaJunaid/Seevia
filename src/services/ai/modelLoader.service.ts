import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';
import hapticService from '../common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia AI Model Loader
 * Manages the lifecycle of on-device neural networks for offline processing.
 */
class ModelLoaderService {
  private readonly MODULE = 'MODEL_LOADER';
  private isTfReady: boolean = false;
  private loadedModels: Map<string, any> = new Map();

  /**
   * Initializes TensorFlow.js and loads essential on-device models.
   */
  async init(): Promise<void> {
    try {
      if (this.isTfReady) return;

      await hapticService.selection(); //
      logger.info(this.MODULE, 'Initializing TensorFlow.js...');
      
      await tf.ready();
      this.isTfReady = true;

      // Automatically load the primary Intent Classifier for Voice
      await this.loadModel('intent_engine', require('@/assets/models/intent_model.json'));
      
      await hapticService.success();
      logger.info(this.MODULE, 'AI Engine Ready.');
    } catch (error) {
      logger.error(this.MODULE, 'TFJS Initialization failed', error);
      await hapticService.error();
    }
  }

  /**
   * Loads a specific model bundle into memory.
   */
  async loadModel(modelId: string, modelJson: any): Promise<any> {
    try {
      logger.info(this.MODULE, `Loading model: ${modelId}`);
      
      const model = await tf.loadLayersModel(bundleResourceIO(modelJson, []));
      this.loadedModels.set(modelId, model);
      
      return model;
    } catch (error) {
      logger.error(this.MODULE, `Failed to load model ${modelId}`, error);
      return null;
    }
  }

  getModel(modelId: string) {
    return this.loadedModels.get(modelId);
  }

  isReady(): boolean {
    return this.isTfReady;
  }
}

export const modelLoaderService = new ModelLoaderService();
