import { useState, useCallback } from 'react';
import { ProductRecognitionService, RecognitionResult } from '@/src/services/ai/productRecognition.service';
import { useAccessibility } from './useAccessibility';
import { APP_CONFIG, ERROR_MESSAGES } from '@/src/constants/config';
import * as Speech from 'expo-speech';

/**
 * Seevia AI Analysis Hook
 * Orchestrates image recognition and accessible feedback for the Vision Module.
 */
export function useProductRecognition() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { triggerHapticFeedback } = useAccessibility();

  const analyzeImage = useCallback(async (imageUri: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);

      // 1. Call AI Service
      const recognition = await ProductRecognitionService.recognizeProduct(imageUri);

      // 2. Validate Confidence based on Seevia Config
      if (recognition && recognition.confidence >= APP_CONFIG.PRODUCT_RECOGNITION_CONFIDENCE_THRESHOLD) {
        setResult(recognition);
        
        // 3. Accessible Feedback (Multimodal)
        await triggerHapticFeedback('success');
        Speech.speak(`Identified: ${recognition.name}. ${recognition.brand || ''}`, {
          rate: APP_CONFIG.TTS_RATE,
        });
        
        return recognition;
      } else {
        throw new Error("Low confidence");
      }
    } catch (err) {
      setError(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      await triggerHapticFeedback('error');
      Speech.speak("Sorry, I couldn't identify that product. Please try again.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [triggerHapticFeedback]);

  const resetRecognition = () => {
    setResult(null);
    setError(null);
  };

  return {
    analyzeImage,
    isAnalyzing,
    result,
    error,
    resetRecognition,
  };
}
