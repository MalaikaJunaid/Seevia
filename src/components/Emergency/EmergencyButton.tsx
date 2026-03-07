import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';
import TtsService from '@/src/services/voice/TtsService';

interface EmergencyButtonProps {
  onTrigger: () => void;
  holdDuration?: number; // default 3000ms
}

/**
 * Fail-safe SOS Trigger for Seevia.
 * Uses a long-press mechanism with haptic "heartbeat" feedback.
 */
export function EmergencyButton({ onTrigger, holdDuration = 3000 }: EmergencyButtonProps) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    setIsPressing(true);
    HapticFeedback.heavyTap();
    
    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDuration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Set trigger timeout
    timerRef.current = setTimeout(() => {
      triggerSOS();
    }, holdDuration);
  };

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
    
    // Reset animation
    Animated.spring(progressAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();

    if (progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] })) {
       // Optional: "Cancelled" feedback
    }
  };

  const triggerSOS = () => {
    HapticFeedback.heavyTap();
    TtsService.speak("Emergency alert initiated.");
    onTrigger();
    setIsPressing(false);
    progressAnim.setValue(0);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          { backgroundColor: isPressing ? theme.danger : '#B91C1C' },
          SHADOWS.lg,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS. Hold for three seconds to trigger alert."
        accessibilityHint="Initiates emergency protocols and contacts your trust circle."
      >
        <View style={styles.content}>
          <Ionicons name="warning" size={40} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {isPressing ? 'HOLDING...' : 'SOS'}
          </Text>
        </View>

        {/* Progress Fill Overlay */}
        <Animated.View 
          style={[
            styles.progressOverlay, 
            { width: progressWidth, backgroundColor: 'rgba(255,255,255,0.3)' }
          ]} 
        />
      </TouchableOpacity>
      
      {!isPressing && (
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          Hold 3s for Emergency
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    zIndex: 2,
    alignItems: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.heading,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  hintText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.md,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
