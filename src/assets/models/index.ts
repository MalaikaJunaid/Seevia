// ML Models for Seevia
// Model file names (actual files should be in assets/models/)

export const ML_MODELS = {
  FALL_DETECTOR: "fall_detector_reimplemented.tflite",
  PRODUCT_SCANNER: "seevia-local-product-recognizer.tflite",
  NAVIGATION_DQN: "dqn_q_network_keras.tflite",
  ZERO_SHOT_EXTRACTOR: "fine_tuned_seevia_extractor.tflite",
  INTENT_ENGINE: "model_quantized.pt",
  LABELS: "label_map.txt",
  CONFIG: "model_metadata.json",
};

export const { FALL_DETECTOR, PRODUCT_SCANNER, NAVIGATION_DQN, ZERO_SHOT_EXTRACTOR, MODEL_QUANTIZED, LABELS, CONFIG } = ML_MODELS;
export { ML_MODELS };
