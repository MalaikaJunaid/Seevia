import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import TtsService from '@/src/services/voice/TtsService';

interface ProductResult {
  name: string;
  brand?: string;
  category?: string;
  confidence: number;
  description?: string;
  warnings?: string[];
}

interface ProductResultCardProps {
  result: ProductResult;
  onAddToPantry: () => void;
  onRetry: () => void;
}

/**
 * AI Vision Result Display for Seevia.
 * Formats multi-tier vision data into accessible, high-contrast feedback.
 */
export function ProductResultCard({
  result,
  onAddToPantry,
  onRetry,
}: ProductResultCardProps) {

  useEffect(() => {
    // Automatically announce the result for PWD accessibility
    const speechText = `Identified ${result.name} ${result.brand ? `by ${result.brand}` : ''}. ${
      result.warnings?.length ? `Warning: ${result.warnings.join(', ')}` : ''
    }`;
    TtsService.speak(speechText);
  }, [result]);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={28} color={theme.success} />
        </View>
        <View style={styles.titleContent}>
          <Text style={[styles.name, { color: theme.text }]}>{result.name}</Text>
          {result.brand && (
            <Text style={[styles.brand, { color: theme.textSecondary }]}>
              {result.brand}
            </Text>
          )}
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {Math.round(result.confidence * 100)}% Match
          </Text>
        </View>
      </View>

      {result.description && (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {result.description}
        </Text>
      )}

      {result.warnings && result.warnings.length > 0 && (
        <View style={[styles.warningBox, { backgroundColor: `${theme.danger}15` }]}>
          <Ionicons name="alert-triangle" size={18} color={theme.danger} />
          <Text style={[styles.warningText, { color: theme.danger }]}>
            {result.warnings.join(' • ')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Add to Pantry"
          onPress={onAddToPantry}
          style={styles.actionButton}
          icon={<Ionicons name="add" size={20} color="#fff" />}
        />
        <Button
          title="Retake"
          variant="outline"
          onPress={onRetry}
          style={styles.retryButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: SPACING.md,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
  titleContent: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.subheading,
    fontSize: 20,
    fontWeight: '800',
  },
  brand: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
  },
  confidenceBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 2,
  },
  retryButton: {
    flex: 1,
  },
});
