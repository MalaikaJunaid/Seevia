import React, { useEffect, useRef } from 'react';
import {
    AccessibilityRole,
    Animated,
    GestureResponderEvent,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Seevia Theme Integration
import { DARK_THEME as theme } from '../../theme/colors';

export interface VoiceButtonProps {
  isListening?: boolean;
  onToggle?: (e?: GestureResponderEvent) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export default function VoiceButton({
  isListening = false,
  onToggle,
  size = 80, // Increased default size for better accessibility
  style,
  testID,
  accessibilityLabel,
}: VoiceButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isListening) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
      animRef.current?.stop();
      animRef.current = null;
    }

    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [isListening, pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const label = accessibilityLabel ?? (isListening ? 'Stop Seevia listening' : 'Start Seevia listening');

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityState={{ busy: !!isListening }}
      accessibilityLabel={label}
      activeOpacity={0.9}
      onPress={onToggle}
      style={[styles.wrapper, style]}
    >
      {/* Dynamic Pulse Glow */}
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
            backgroundColor: isListening ? theme.primary : 'transparent',
          },
        ]}
        pointerEvents="none"
      />
      
      {/* Main Button Surface */}
      <Animated.View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isListening ? theme.danger : theme.primary,
            transform: [{ scale: isListening ? 1.05 : 1 }],
            shadowColor: isListening ? theme.danger : theme.primary,
          },
        ]}
      >
        <Ionicons 
          name={isListening ? "mic-off" : "mic"} 
          size={Math.round(size / 2)} 
          color="#FFFFFF" 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});
