import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/src/theme';
import { BrailleDots } from './BrailleDots';
// Placeholder for your accessibility service
import HapticFeedback from '@/src/services/shopping/HapticFeedback'; 

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export function BackHeader({
  title,
  subtitle,
  icon,
  onBackPress,
  rightComponent,
}: BackHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    // Trigger Module 1/4 tactile feedback
    HapticFeedback.lightTap(); 
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.cardBorder,
        },
      ]}
    >
      {/* High Contrast Back Button */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={styles.backButton}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={32} color={theme.primary} />
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        {/* Sensory Indicator */}
        <BrailleDots />
        
        {/* Module Icon (e.g., Archive for Pantry) */}
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Optional Right Action (e.g., Save or Delete) */}
      {rightComponent && (
        <View style={styles.rightContainer}>{rightComponent}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.xl + 12, 
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    top: SPACING.xl + 12,
    left: SPACING.md,
    zIndex: 10,
    padding: 4,
  },
  centerContainer: {
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  iconContainer: {
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: 2,
  },
  rightContainer: {
    position: 'absolute',
    top: SPACING.xl + 12,
    right: SPACING.md,
  },
});
