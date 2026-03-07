import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { IntentEngineService } from '@/src/services/ai/intentEngine.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

const VoiceCommandScreen = () => {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Listening for your command...");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  const startListening = async () => {
    setIsListening(true);
    hapticService.selection();
    
    // Start Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Simulating STT + Intent Processing for Defense
    // In production, this hooks into your Whisper/Speech SDK
    logger.info('VOICE_UI', 'Microphone active');
  };

  const stopListening = () => {
    setIsListening(false);
    pulseAnim.stopAnimation();
  };

  const handleManualTrigger = async () => {
    // Mocking a successful intent for the 60% Demo
    setTranscript("Processing: 'Show my pantry'...");
    await hapticService.trigger('success');
    
    setTimeout(() => {
      router.push('/(tabs)/pantry');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={30} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={60} color="white" />
          </View>
        </Animated.View>
        
        <Text style={styles.transcriptText}>{transcript}</Text>
        <Text style={styles.hintText}>Try: "What is in my kitchen?" or "Check expiry"</Text>
      </View>

      <TouchableOpacity style={styles.manualBtn} onPress={handleManualTrigger}>
        <Text style={styles.manualBtnText}>Simulate Command (Demo Only)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  content: { alignItems: 'center', padding: 40 },
  pulseCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  micCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  transcriptText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  hintText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  manualBtn: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
  },
  manualBtnText: { color: 'white', fontSize: 12 },
});

export default VoiceCommandScreen;
