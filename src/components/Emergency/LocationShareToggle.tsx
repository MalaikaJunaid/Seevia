import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Switch, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';
import TtsService from '@/src/services/voice/TtsService';

interface LocationShareToggleProps {
  isSharing: boolean;
  onToggle: (value: boolean) => void;
  lastSynced?: string;
}

/**
 * Privacy-Focused GPS Sharing Toggle for Seevia.
 * Manages real-time coordinate transmission to the user's trust circle.
 */
export function LocationShareToggle({ isSharing, onToggle, lastSynced }: LocationShareToggleProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSharing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSharing]);

  const handleToggle = (value: boolean) => {
    HapticFeedback.mediumTap();
    const status = value ? "active" : "disabled";
    TtsService.speak(`Location sharing is now ${status}.`);
    onToggle(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: isSharing ? theme.primary : theme.cardBorder }]}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.pulseCircle, { 
          backgroundColor: isSharing ? `${theme.primary}30` : 'transparent',
          transform: [{ scale: pulseAnim }] 
        }]} />
        <Ionicons 
          name={isSharing ? "location" : "location-outline"} 
          size={24} 
          color={isSharing ? theme.primary : theme.textTertiary} 
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]}>Emergency GPS Sharing</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isSharing ? "Trust circle can see your live location" : "Location hidden from others"}
        </Text>
        {lastSynced && isSharing && (
          <Text style={[styles.syncText, { color: theme.success }]}>
            Synced: {lastSynced}
          </Text>
        )}
      </View>

      <Switch
        trackColor={{ false: '#333', true: `${theme.primary}50` }}
        thumbColor={isSharing ? theme.primary : '#666'}
        ios_backgroundColor="#333"
        onValueChange={handleToggle}
        value={isSharing}
        accessibilityLabel="Toggle live location sharing with emergency contacts"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginVertical: SPACING.sm,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  pulseCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  info: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '800',
    fontSize: 16,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
