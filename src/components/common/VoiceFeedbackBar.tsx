import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/theme/colors';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme';
import HapticFeedback from '@/services/shopping/HapticFeedback';

interface VoiceFeedbackBarProps {
  message: string;
  visible: boolean;
}

function VoiceFeedbackBar({ message, visible }: VoiceFeedbackBarProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible && message) {
      HapticFeedback.lightTap();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, message]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        SHADOWS.lg,
      ]}
    >
      <Ionicons name="mic" size={22} color={theme.primary} />
      <Text
        style={[
          styles.text,
          {
            color: theme.text,
          },
        ]}
        numberOfLines={2}
      >
        <Text style={{ color: theme.primary, fontWeight: '800' }}>AI Heard: </Text>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110, 
    left: SPACING.md,
    right: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    zIndex: 999,
  },
  text: {
    ...TYPOGRAPHY.body,
    flex: 1,
    fontSize: 15,
  },
});

export default VoiceFeedbackBar;