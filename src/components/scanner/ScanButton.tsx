import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface ScanButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  label?: string;
}

/**
 * AI Vision Trigger for Seevia.
 * Specialized button for initiating object and product recognition.
 */
export function ScanButton({
  onPress,
  isLoading = false,
  label = 'Identify Item',
}: ScanButtonProps) {
  
  const handlePress = () => {
    // Heavy haptic to signal the start of intensive AI processing
    HapticFeedback.heavyTap();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={isLoading ? "AI is identifying the item" : label}
      style={[
        styles.container,
        {
          backgroundColor: isLoading ? theme.card : theme.primary,
          borderColor: isLoading ? theme.primary : 'transparent',
          borderWidth: isLoading ? 2 : 0,
        },
        SHADOWS.lg,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.text, { color: theme.primary, marginLeft: SPACING.sm }]}>
            Analyzing...
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Ionicons name="scan-circle" size={28} color="#FFFFFF" />
          <Text style={styles.text}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    marginLeft: SPACING.sm,
    letterSpacing: 0.5,
  },
});
