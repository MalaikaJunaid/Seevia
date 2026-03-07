import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import TtsService from '@/src/services/voice/TtsService';

interface StoreHeaderProps {
  storeName: string;
  locationName: string;
  isConnected: boolean;
  onBackPress?: () => void;
}

/**
 * Navigation Header for Seevia Store Guide.
 * Displays store branding and real-time connectivity status.
 */
export function StoreHeader({ storeName, locationName, isConnected, onBackPress }: StoreHeaderProps) {
  const pulseAnim = new Animated.Value(0.4);

  useEffect(() => {
    // Announce store entry for accessibility
    TtsService.speak(`Connected to ${storeName}, ${locationName} branch.`);

    // Connectivity Pulse Animation
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isConnected]);

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={[styles.storeTitle, { color: theme.primary }]}>
            {storeName.toUpperCase()}
          </Text>
          <Text style={[styles.locationSubtitle, { color: theme.textSecondary }]}>
            {locationName}
          </Text>
        </View>

        <View style={styles.statusSection}>
          <Animated.View 
            style={[
              styles.statusDot, 
              { 
                backgroundColor: isConnected ? theme.success : theme.danger,
                opacity: isConnected ? pulseAnim : 1 
              }
            ]} 
          />
          <Text style={[styles.statusText, { color: isConnected ? theme.success : theme.danger }]}>
            {isConnected ? 'LIVE TRACKING' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50, // Safe area padding
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  infoSection: {
    flex: 1,
  },
  storeTitle: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  locationSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
