import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/theme/colors';
import { SHADOWS } from '@/theme';
import { hapticService } from '@/services/common/haptic.service';

interface FloatingMicButtonProps {
  onPress: () => void;
  isListening?: boolean;
}

export default function FloatingMicButton({ onPress, isListening = false }: FloatingMicButtonProps) {
  // Animation value for the pulsing effect when active
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      // Start continuous pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15, // Scale up by 15%
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1, // Scale back down
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop and reset animation immediately when listening ends
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handlePress = () => {
    // Heavy physical feedback so the user instantly knows the mic state toggled
    hapticService.trigger('heavy');
    onPress();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.button,
            isListening ? styles.listeningState : styles.idleState,
          ]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={isListening ? "Seevia is listening. Double tap to stop." : "Activate voice command"}
          accessibilityHint="Double tap to give a voice command to Seevia in Urdu or English"
        >
          <Ionicons 
            name={isListening ? "mic" : "mic-outline"} 
            size={42} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30, // Elevated slightly to avoid bottom tab overlap
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Maximum z-index to guarantee it is always on top
  },
  button: {
    width: 85,
    height: 85,
    borderRadius: 42.5, // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  idleState: {
    backgroundColor: theme.primary,
  },
  listeningState: {
    backgroundColor: theme.danger, // Turns prominent red when actively recording
    borderColor: '#FFFFFF', // High contrast border when active
  },
});