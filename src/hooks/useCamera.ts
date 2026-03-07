import { useState, useEffect, useCallback } from 'react';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { ProductRecognitionService } from '@/src/services/ai/productRecognition.service';
import { BarcodeService } from '@/src/services/scanner/barcode.service';
import { useAccessibility } from './useAccessibility';
import { ERROR_MESSAGES } from '@/src/constants/config';

/**
 * Seevia AI Vision Hook
 * Manages camera hardware, photo processing, and AI service orchestration.
 */
export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { triggerHapticFeedback } = useAccessibility();

  /**
   * Captures a high-quality photo for AI Analysis.
   * Triggers haptic feedback to confirm capture for PWD users.
   */
  const capturePhoto = async (cameraRef: CameraView | null) => {
    if (!cameraRef) return null;

    try {
      setIsScanning(true);
      setError(null);
      
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
        shutterSound: false, // We use custom haptics for accessibility
      });

      if (photo) {
        await triggerHapticFeedback('medium');
        return photo.uri;
      }
      return null;
    } catch (err) {
      setError(ERROR_MESSAGES.CAMERA_PERMISSION);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Sends image to Google Vision/Gemini for product identification.
   */
  const recognizeProduct = useCallback(async (imageUri: string) => {
    try {
      setIsScanning(true);
      setError(null);
      const result = await ProductRecognitionService.recognizeProduct(imageUri);
      return result;
    } catch (err) {
      setError(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Processes raw barcode data through the Global Barcode Database.
   */
  const scanBarcode = useCallback(async (barcodeData: string) => {
    try {
      setIsScanning(true);
      setError(null);
      const product = await BarcodeService.lookupBarcode(barcodeData);
      return product;
    } catch (err) {
      setError(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  return {
    hasPermission: permission?.granted ?? null,
    isScanning,
    error,
    requestPermission,
    capturePhoto,
    recognizeProduct,
    scanBarcode,
  };
}
