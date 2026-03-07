import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';

interface VoiceIndicatorProps {
  isListening: boolean;
  volume: number; // Normalized 0 to 1
}

/**
 * Visual Waveform Indicator for Seevia.
 * Provides real-time visual feedback of voice input levels.
 */
export function VoiceIndicator({ isListening, volume }: VoiceIndicatorProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isListening) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1 + volume * 1.5,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3 + volume * 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(0.4);
    }
  }, [volume, isListening]);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                backgroundColor: theme.primary,
                height: 20 + i * 10,
                transform: [{ scaleY: isListening ? scaleAnim : 1 }],
                opacity: opacityAnim,
              },
            ]}
          />
        ))}
      </View>
      {isListening && (
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          AI is listening...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    height: 120,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 80,
  },
  bar: {
    width: 6,
    borderRadius: RADIUS.full,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
