import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { ProductRecognitionService } from '@/src/services/ai/productRecognition.service';
import { SceneImaginationService } from '@/src/services/ai/sceneImagination.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

const CameraVisionScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        TextToSpeechService.speak("Camera ready. Tap anywhere to scan the product in front of you.");
      }
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      await hapticService.light();
      
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      
      // Multi-Step AI Analysis
      await TextToSpeechService.speak("Analyzing your surroundings...");
      
      // 1. Imagine the Scene first for spatial awareness
      const sceneDescription = await SceneImaginationService.imagine(photo.uri);
      
      // 2. Recognize specific product
      const result = await ProductRecognitionService.recognizeProduct(photo.uri);

      if (result.success && result.product) {
        await hapticService.trigger('success');
        await TextToSpeechService.speak(`Identified ${result.product.name}.`);
        router.push({
          pathname: '/pantry/confirm-add',
          params: { product: JSON.stringify(result.product) }
        });
      } else {
        await TextToSpeechService.speak("I couldn't identify a specific product, but " + sceneDescription);
      }
    } catch (error) {
      logger.error('CAMERA_VISION', 'Capture failed', error);
      await TextToSpeechService.speak("Vision error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={cameraRef}
        facing="back"
      >
        <TouchableOpacity 
          style={styles.touchArea} 
          onPress={handleCapture}
          activeOpacity={1}
        >
          {isProcessing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </TouchableOpacity>
      </CameraView>
      
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Tap anywhere to capture</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  touchArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center'
  },
  loadingText: { color: 'white', marginTop: 10, fontWeight: 'bold' },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  hintText: { color: 'white', fontSize: 16 }
});

export default CameraVisionScreen;
