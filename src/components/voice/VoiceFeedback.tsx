import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';

interface VoiceFeedbackProps {
  transcript: string;
  isProcessing: boolean;
  error?: string | null;
}

/**
 * Real-time Transcription Overlay for Seevia.
 * Visualizes the AI's understanding of user commands in high-contrast text.
 */
export function VoiceFeedback({ transcript, isProcessing, error }: VoiceFeedbackProps) {
  if (!transcript && !isProcessing && !error) return null;

  return (
    <View style={[styles.container, { backgroundColor: `${theme.card}F0` }]}>
      <View style={styles.content}>
        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {error}
          </Text>
        ) : (
          <>
            <Text 
              style={[styles.transcriptText, { color: theme.text }]}
              numberOfLines={3}
            >
              {transcript || "Speak now..."}
            </Text>
            
            {isProcessing && (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.processingText, { color: theme.primary }]}>
                  Analyzing command...
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // Positioned above the FloatingMicButton
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 80,
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  transcriptText: {
    ...TYPOGRAPHY.body,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 8,
  },
  processingText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
