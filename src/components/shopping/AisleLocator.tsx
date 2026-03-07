import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';
import TtsService from '@/src/services/voice/TtsService';

interface AisleLocatorProps {
  targetAisle: string;
  itemName: string;
  distance: number; // In meters
  direction: 'forward' | 'left' | 'right' | 'arrival';
}

/**
 * Indoor Navigation Guide for Seevia (Save Mart Module).
 * Provides high-contrast directional cues and tactile proximity feedback.
 */
export function AisleLocator({ targetAisle, itemName, distance, direction }: AisleLocatorProps) {
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Proximity Haptics: Pulse faster as distance decreases
    const interval = distance < 2 ? 500 : 1500;
    const timer = setInterval(() => {
      if (direction !== 'arrival') HapticFeedback.lightTap();
    }, interval);

    // Audio Cue on state change
    if (direction === 'arrival') {
      TtsService.speak(`Arrived at ${targetAisle}. ${itemName} is nearby.`);
      HapticFeedback.heavyTap();
    }

    return () => clearInterval(timer);
  }, [distance, direction]);

  const getDirectionIcon = () => {
    switch (direction) {
      case 'left': return 'arrow-back-outline';
      case 'right': return 'arrow-forward-outline';
      case 'arrival': return 'location-sharp';
      default: return 'arrow-up-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.targetText, { color: theme.primary }]}>
          FINDING: {itemName.toUpperCase()}
        </Text>
        <Text style={[styles.aisleText, { color: theme.text }]}>
          Aisle {targetAisle}
        </Text>
      </View>

      <View style={styles.navZone}>
        <View style={[styles.iconCircle, { backgroundColor: direction === 'arrival' ? theme.success : theme.primary }]}>
          <Ionicons name={getDirectionIcon()} size={64} color="#FFFFFF" />
        </View>
        
        <Text style={[styles.distanceText, { color: theme.text }]}>
          {direction === 'arrival' ? 'YOU ARE HERE' : `${distance} Meters Away`}
        </Text>
      </View>

      <View style={[styles.instructionBox, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          {direction === 'forward' && "Keep walking straight"}
          {direction === 'left' && "Turn left at the next corner"}
          {direction === 'right' && "Turn right at the next corner"}
          {direction === 'arrival' && `Look for ${itemName} on the shelves`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  targetText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    letterSpacing: 2,
  },
  aisleText: {
    ...TYPOGRAPHY.heading,
    fontSize: 32,
  },
  navZone: {
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  distanceText: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '700',
  },
  instructionBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  instructionText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    fontWeight: '600',
  },
});
