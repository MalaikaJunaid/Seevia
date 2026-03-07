import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
// Seevia Theme Integration
import { DARK_THEME as theme } from '../../theme/colors';

export interface VoiceIndicatorProps {
  listening?: boolean;
  size?: number;
  color?: string;
}

export default function VoiceIndicator({
  listening = false,
  size = 18,
  // Defaulting to Seevia Primary Orange
  color = theme.primary, 
}: VoiceIndicatorProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (listening) {
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
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    }
    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [listening, pulse]);

  // Smoother interpolation for accessible visual feedback
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.2] });

  return (
    <View style={styles.wrapper}>
      {/* Outer Glow Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 2.5,
            height: size * 2.5,
            borderRadius: (size * 2.5) / 2,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      {/* Solid Inner Core */}
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            position: 'absolute',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  ring: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  }
});
