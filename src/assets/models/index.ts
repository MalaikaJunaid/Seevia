export const ML_MODELS = {
  // Production Core
  FALL_DETECTOR: require('./fall_detector_reimplemented.tflite'),
  INTENT_ENGINE: require('./seevia-intent-model.tflite'),
  PRODUCT_SCANNER: require('./seevia-local-product-recognizer.tflite'),
  
  // Advanced Navigation & Zero-Shot (R&D)
  ZERO_SHOT_EXTRACTOR: require('./seevia-zeroshot-extractor.tflite'),
  NAVIGATION_DQN: require('./aisle-navigation-dqn.tflite'),
  PATH_IMAGINATION: require('./path-imagination-vae.tflite'),

  // Metadata
  LABELS: require('./label_map.txt'),
  CONFIG: require('./model_metadata.json'),
};
