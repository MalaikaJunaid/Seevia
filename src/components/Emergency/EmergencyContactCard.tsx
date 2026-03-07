import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  isPrimary: boolean;
}

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  onEdit?: () => void;
}

/**
 * Trust Circle Contact Card for Seevia.
 * Facilitates rapid communication with caregivers and emergency responders.
 */
export function EmergencyContactCard({ contact, onEdit }: EmergencyContactCardProps) {
  
  const handleCall = () => {
    HapticFeedback.mediumTap();
    Linking.openURL(`tel:${contact.phoneNumber}`);
  };

  const handleSMS = () => {
    HapticFeedback.lightTap();
    Linking.openURL(`sms:${contact.phoneNumber}`);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card, 
          borderLeftColor: contact.isPrimary ? theme.danger : theme.primary,
          borderColor: theme.cardBorder 
        },
        SHADOWS.sm
      ]}
    >
      <View style={styles.infoSection}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {contact.name}
          </Text>
          {contact.isPrimary && (
            <View style={[styles.sosBadge, { backgroundColor: `${theme.danger}20` }]}>
              <Text style={[styles.sosText, { color: theme.danger }]}>PRIMARY SOS</Text>
            </View>
          )}
        </View>
        <Text style={[styles.relationship, { color: theme.textSecondary }]}>
          {contact.relationship}
        </Text>
        <Text style={[styles.phone, { color: theme.textTertiary }]}>
          {contact.phoneNumber}
        </Text>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity 
          onPress={handleCall}
          style={[styles.actionButton, { backgroundColor: theme.success }]}
          accessibilityLabel={`Call ${contact.name}`}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSMS}
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          accessibilityLabel={`Message ${contact.name}`}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    ...TYPOGRAPHY.subheading,
    fontWeight: '800',
    fontSize: 18,
  },
  relationship: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phone: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    marginTop: 2,
  },
  sosBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sosText: {
    fontSize: 9,
    fontWeight: '900',
  },
  actionSection: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
});
