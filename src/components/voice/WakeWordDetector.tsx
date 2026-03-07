import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Seevia Core Imports
import { SpeechToTextService } from '@/src/services/voice/SpeechToTextService';
import TtsService from '@/src/services/voice/TtsService';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface WakeWordDetectorProps {
  onWakeWordDetected: () => void;
  isActive?: boolean;
}

/**
 * Always-on Keyword Spotting for Seevia.
 * Listens for the "Hey Seevia" wake word to trigger hands-free AI assistance.
 */
export function WakeWordDetector({ onWakeWordDetected, isActive = true }: WakeWordDetectorProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => stopMonitoring();
  }, [isActive]);

  const startMonitoring = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // We use a low-latency monitoring cycle
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      setRecording(newRecording);

      // In a production PWD app, we analyze the RMS levels or use a Lite model
      intervalRef.current = setInterval(async () => {
        const status = await newRecording.getStatusAsync();
        if (status.metering && status.metering > -20) { // Simple decibel threshold for prototype
          handleDetection();
        }
      }, 500);
    } catch (err) {
      console.error('Failed to start wake word monitoring', err);
    }
  };

  const stopMonitoring = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    }
  };

  const handleDetection = () => {
    // Provide immediate multimodal feedback
    HapticFeedback.heavyTap();
    TtsService.speak("Listening");
    onWakeWordDetected();
  };

  return null; // This is a logic-only provider component
}
