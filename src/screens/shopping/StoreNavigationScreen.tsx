import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { SceneImaginationService } from '@/src/services/ai/sceneImagination.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

const StoreNavigationScreen = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [directionHint, setDirectionHint] = useState("Tap to start navigation");
  const navigationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => stopNavigation();
  }, []);

  const startNavigation = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      TextToSpeechService.speak("Camera permission required for navigation.");
      return;
    }

    setIsNavigating(true);
    hapticService.trigger('success');
    TextToSpeechService.speak("Navigation mode active. Hold your phone upright and scan the floor in front of you.");
    
    // Proactive Loop: Analyze scene every 3 seconds
    navigationInterval.current = setInterval(processNavigationFrame, 3500);
  };

  const stopNavigation = () => {
    if (navigationInterval.current) clearInterval(navigationInterval.current);
    setIsNavigating(false);
    setDirectionHint("Navigation paused");
    TextToSpeechService.speak("Navigation paused.");
  };

  const processNavigationFrame = async () => {
    // Note: In a real implementation, you would capture a frame from the camera
    // For the 60% defense, we simulate the spatial interpretation
    try {
      const insight = await SceneImaginationService.imagine("current_frame_uri");
      setDirectionHint(insight);
      
      // Provide tactile feedback based on path clarity
      if (insight.toLowerCase().includes("clear")) {
        await hapticService.light();
      } else {
        await hapticService.trigger('warning');
      }
      
      await TextToSpeechService.speak(insight);
    } catch (err) {
      logger.error('NAV_SCREEN', 'Navigation frame error', err);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.preview} facing="back">
        <View style={styles.overlay}>
          <View style={styles.statusCard}>
            <Ionicons 
              name={isNavigating ? "navigate" : "pause-circle"} 
              size={40} 
              color={isNavigating ? colors.primary : colors.textSecondary} 
            />
            <Text style={styles.hintText}>{directionHint}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isNavigating ? colors.error : colors.primary }]}
            onPress={isNavigating ? stopNavigation : startNavigation}
          >
            <Text style={styles.buttonText}>
              {isNavigating ? "STOP NAVIGATION" : "START NAVIGATION"}
            </Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  preview: { flex: 1 },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'space-between', 
    padding: 30,
    paddingBottom: 60 
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 50,
    elevation: 5
  },
  hintText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginTop: 15,
    color: colors.text 
  },
  actionButton: {
    padding: 20,
    borderRadius: 50,
    alignItems: 'center',
    elevation: 3
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});

export default StoreNavigationScreen;
