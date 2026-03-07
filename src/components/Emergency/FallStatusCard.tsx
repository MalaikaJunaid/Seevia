import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/src/theme';
import { Card } from '../common/Card';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface FallStatusProps {
  riskLevel: 'low' | 'medium' | 'high';
  impactValue: number; // G-force or calculated score
  isMonitoring: boolean;
  onCancelAlert: () => void;
}

/**
 * AI Fall Monitoring Card for Seevia.
 * Visualizes accelerometer data and manages emergency countdowns.
 */
export function FallStatusCard({ riskLevel, impactValue, isMonitoring, onCancelAlert }: FallStatusProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (riskLevel === 'high' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
        HapticFeedback.lightTap(); // Alerting heartbeat
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [riskLevel, countdown]);

  const getStatusConfig = () => {
    switch (riskLevel) {
      case 'high': return { color: theme.danger, label: 'FALL DETECTED', icon: 'alert-circle' };
      case 'medium': return { color: theme.primary, label: 'UNUSUAL MOTION', icon: 'warning' };
      default: return { color: theme.success, label: 'STABLE', icon: 'shield-checkmark' };
    }
  };

  const config = getStatusConfig();

  return (
    <Card style={[styles.container, { borderColor: config.color }]}>
      <View style={styles.header}>
        <Ionicons name={config.icon as any} size={24} color={config.color} />
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.label}
        </Text>
        {isMonitoring && <ActivityIndicator size="small" color={theme.textTertiary} style={styles.loader} />}
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={[styles.dataValue, { color: theme.text }]}>{impactValue.toFixed(2)}g</Text>
          <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>Impact Force</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        <View style={styles.dataItem}>
          <Text style={[styles.dataValue, { color: theme.text }]}>
            {riskLevel === 'high' ? `${countdown}s` : 'Active'}
          </Text>
          <Text style={[styles.dataLabel, { color: theme.textSecondary }]}>
            {riskLevel === 'high' ? 'SOS Countdown' : 'Monitoring'}
          </Text>
        </View>
      </View>

      {riskLevel === 'high' && (
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: theme.cardBorder }]}
          onPress={() => {
            HapticFeedback.mediumTap();
            onCancelAlert();
            setCountdown(30);
          }}
        >
          <Text style={[styles.cancelText, { color: theme.text }]}>I AM OKAY - CANCEL SOS</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: 10,
  },
  statusLabel: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loader: {
    marginLeft: 'auto',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dataItem: {
    alignItems: 'center',
  },
  dataValue: {
    ...TYPOGRAPHY.heading,
    fontSize: 24,
  },
  dataLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 40,
  },
  cancelButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
