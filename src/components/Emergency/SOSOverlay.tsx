import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';
import TtsService from '@/src/services/voice/TtsService';

interface SOSOverlayProps {
  onCancel: () => void;
  primaryContactName: string;
  locationStatus: string;
}

/**
 * Emergency SOS Mode for Seevia.
 * Full-screen high-urgency interface for active emergency events.
 */
export function SOSOverlay({ onCancel, primaryContactName, locationStatus }: SOSOverlayProps) {
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start Flashing Alarm Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ])
    ).start();

    // Continuous Audio/Haptic Feedback
    const alertInterval = setInterval(() => {
      HapticFeedback.heavyTap();
    }, 1000);

    TtsService.speak(`Emergency Alert Active. Notifying ${primaryContactName}.`);

    return () => clearInterval(alertInterval);
  }, [primaryContactName]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.background, theme.danger],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Ionicons name="notifications-outline" size={80} color="#FFFFFF" />
        
        <Text style={styles.title}>EMERGENCY ACTIVE</Text>
        
        <View style={styles.statusBox}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            NOTIFYING: <Text style={{ color: '#FFF', fontWeight: '900' }}>{primaryContactName.toUpperCase()}</Text>
          </Text>
          <Text style={[styles.statusText, { color: theme.textSecondary, marginTop: 8 }]}>
            GPS STATUS: <Text style={{ color: theme.success }}>{locationStatus}</Text>
          </Text>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Your coordinates and a help message have been sent. Stay where you are.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => {
            HapticFeedback.mediumTap();
            onCancel();
          }}
          accessibilityLabel="I am safe, cancel emergency alert"
        >
          <Text style={styles.cancelText}>I AM SAFE - CANCEL SOS</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: SPACING.xl,
    width: '100%',
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: '#FFFFFF',
    fontSize: 32,
    marginTop: SPACING.lg,
    textAlign: 'center',
    letterSpacing: 2,
  },
  statusBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  instructionContainer: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  instructionText: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 50,
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    elevation: 10,
  },
  cancelText: {
    color: theme.danger,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
});
