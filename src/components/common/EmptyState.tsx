import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/src/theme';
import { Button } from './Button';
import TtsService from '@/src/services/voice/TtsService';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  shouldSpeak?: boolean; // New: Auditory accessibility trigger
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  shouldSpeak = true,
}: EmptyStateProps) {

  useEffect(() => {
    // Automatically announce empty state message for visually impaired users
    if (shouldSpeak) {
      TtsService.speak(`${title}. ${message}`);
    }
  }, [title, message]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Ionicons name={icon} size={100} color={theme.textTertiary} />
      
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.heading,
    fontSize: 24,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  button: {
    marginTop: SPACING.xl,
    minWidth: 200,
  },
});
