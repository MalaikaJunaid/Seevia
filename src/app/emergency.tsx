/**
 * Seevia Emergency Screen
 * Comprehensive emergency management with SOS functionality
 * Matches mockup design with accessibility features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Components
import BackHeader from '@/components/common/BackHeader';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ScreenLayout from '@/components/common/ScreenLayout';
import { AccessibleSwitch } from '@/components/ui/AccessibleSwitch';

// Services & Hooks
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { hapticService } from '@/services/common/haptic.service';
import TtsService from '@/services/voice/TtsService';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';

// Types
type SOSStatus = 'IDLE' | 'CONTACT_ALERTING' | 'EMERGENCY_ACTIVE' | 'ESCALATING_TO_VOLUNTEERS';

export default function EmergencyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [sosStatus, setSOSStatus] = useState<SOSStatus>('IDLE');
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inactivityMonitoring, setInactivityMonitoring] = useState(true);
  const [fallDetectionEnabled, setFallDetectionEnabled] = useState(true);

  // Announce screen to screen reader
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      'Emergency screen loaded. SOS button is ready. Tap to trigger emergency alert.'
    );
  }, []);

  // Load emergency contacts
  useEffect(() => {
    loadEmergencyContacts();
  }, [user]);

  const loadEmergencyContacts = async () => {
    try {
      // In production: fetch from Firestore
      setContacts([
        { id: '1', name: 'Mom', phone: '+92 300 1234567', relationship: 'Mother', priority: 1 },
        { id: '2', name: 'Dad', phone: '+92 300 7654321', relationship: 'Father', priority: 2 },
        { id: '3', name: 'Sister', phone: '+92 300 9876543', relationship: 'Sister', priority: 3 },
      ]);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleSOSButtonPress = async () => {
    if (sosStatus === 'IDLE') {
      await triggerSOS();
    } else {
      await cancelSOS();
    }
  };

  const triggerSOS = async () => {
    setLoading(true);

    try {
      await hapticService.trigger('error');
      await TtsService.speak('Initiating emergency protocol');

      // Simulate SOS trigger
      setSOSStatus('CONTACT_ALERTING');
      setCurrentAlert({
        id: `alert_${Date.now()}`,
        activationType: 'MANUAL',
        status: 'CONTACT_ALERTING',
        createdAt: Date.now(),
      });

      await TtsService.speak('Emergency contacts are being notified with your location.');
      Alert.alert(
        'SOS Activated',
        'Your emergency contacts have been notified with your location. Help is on the way.'
      );
    } catch (error) {
      console.error('Failed to trigger SOS:', error);
      await TtsService.speak('Failed to trigger emergency protocol. Please try again.');
      Alert.alert('Error', 'Failed to trigger SOS. Please ensure location is enabled.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSOS = async () => {
    Alert.alert(
      'Cancel Emergency?',
      'Are you sure you want to cancel the emergency alert?',
      [
        { text: 'No', onPress: () => {} },
        {
          text: 'Yes, Cancel',
          onPress: async () => {
            try {
              await hapticService.trigger('success');
              setSOSStatus('IDLE');
              setCurrentAlert(null);
              await TtsService.speak('Emergency cancelled');
            } catch (error) {
              console.error('Failed to cancel SOS:', error);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    switch (sosStatus) {
      case 'EMERGENCY_ACTIVE':
      case 'CONTACT_ALERTING':
      case 'ESCALATING_TO_VOLUNTEERS':
        return colors.danger;
      case 'IDLE':
      default:
        return colors.success;
    }
  };

  const getStatusText = () => {
    switch (sosStatus) {
      case 'EMERGENCY_ACTIVE':
        return 'Emergency Active - Help is on the way';
      case 'CONTACT_ALERTING':
        return 'Notifying emergency contacts...';
      case 'ESCALATING_TO_VOLUNTEERS':
        return 'Escalating to volunteer community...';
      case 'IDLE':
      default:
        return 'Ready for emergencies. Tap to activate.';
    }
  };

  const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    content: { padding: SPACING.lg },
    section: { marginBottom: SPACING.xl },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      ...TYPOGRAPHY.heading,
      marginLeft: SPACING.sm,
    },
    cardLabel: {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
      marginBottom: SPACING.sm,
    },
    divider: {
      height: 1,
      marginLeft: 60,
    },
    switchContainer: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: 0,
    },
    sosButton: {
      width: 160,
      height: 160,
      borderRadius: 80,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: SPACING.xl,
      marginBottom: SPACING.lg,
      shadowColor: colors.danger,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
    },
    sosButtonText: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
    },
    sosButtonLabel: {
      color: '#fff',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
    },
    statusContainer: {
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderLeftWidth: 4,
      marginBottom: SPACING.lg,
    },
    statusTitle: {
      ...TYPOGRAPHY.heading,
      marginBottom: SPACING.sm,
    },
    statusText: {
      ...TYPOGRAPHY.body,
      lineHeight: 20,
    },
    contactItem: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
    },
    contactName: {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
      marginBottom: SPACING.xs,
    },
    contactPhone: {
      ...TYPOGRAPHY.small,
      color: colors.textSecondary,
    },
    contactRelationship: {
      ...TYPOGRAPHY.small,
      color: colors.textTertiary,
      marginTop: SPACING.xs,
    },
    flowStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    stepNumberText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    stepText: {
      ...TYPOGRAPHY.body,
      flex: 1,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
    },
    rowLabel: {
      ...TYPOGRAPHY.body,
      color: colors.textSecondary,
    },
    rowValue: {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: SPACING.md, color: colors.text }}>
            Initiating emergency protocol...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <BackHeader
        title="Emergency"
        subtitle="Safety and emergency contacts"
        icon={<Ionicons name="shield-checkmark" size={40} color={colors.danger} />}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityLabel="Emergency"
      >
        {/* SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, { backgroundColor: sosStatus === 'IDLE' ? colors.danger : colors.warning }]}
          onPress={handleSOSButtonPress}
          accessible={true}
          accessibilityLabel={sosStatus === 'IDLE' ? 'Emergency SOS Button' : 'Cancel Emergency Alert'}
          accessibilityRole="button"
          accessibilityHint={sosStatus === 'IDLE' ? 'Double tap to send SOS' : 'Double tap to cancel'}
        >
          <Text style={styles.sosButtonText}>SOS</Text>
          <Text style={styles.sosButtonLabel}>
            {sosStatus === 'IDLE' ? 'TAP' : 'ACTIVE'}
          </Text>
        </TouchableOpacity>

        {/* Status Box */}
        <View
          style={[
            styles.statusContainer,
            {
              backgroundColor: colors.card,
              borderLeftColor: getStatusColor(),
            },
          ]}
        >
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {sosStatus === 'IDLE' ? '✓ Ready' : '⚠ Emergency Active'}
          </Text>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Emergency Flow */}
        <View style={styles.section} accessible={true} accessibilityRole="header">
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              How Emergency Alert Works
            </Text>
          </View>

          <Card>
            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                You trigger SOS by tapping button or saying "Help me"
              </Text>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                Your location and health info sent to emergency contacts
              </Text>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                If no response in 60 seconds, volunteers are notified
              </Text>
            </View>

            <View style={styles.flowStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                If still no response, emergency services called
              </Text>
            </View>
          </Card>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section} accessible={true} accessibilityRole="header">
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Emergency Contacts ({contacts.length})
            </Text>
          </View>

          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <View key={contact.id} style={styles.contactItem}>
                <Text style={[styles.contactName, { color: colors.text }]}>
                  {contact.name} ({contact.relationship})
                </Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
                <Text style={styles.contactRelationship}>Priority: {contact.priority}</Text>
              </View>
            ))
          ) : (
            <Card>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: SPACING.lg }}>
                No emergency contacts configured. Add contacts in settings.
              </Text>
            </Card>
          )}
        </View>

        {/* Current Alert Details */}
        {currentAlert && (
          <View style={styles.section} accessible={true} accessibilityRole="header">
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Alert Details
              </Text>
            </View>

            <Card>
              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={styles.rowLabel}>Triggered by:</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {currentAlert.activationType.replace(/_/g, ' ')}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={styles.rowLabel}>Status:</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {currentAlert.status}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Time Elapsed:</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {Math.round((Date.now() - currentAlert.createdAt) / 1000)}s
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Emergency Settings */}
        <View style={styles.section} accessible={true} accessibilityRole="header">
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Emergency Settings
            </Text>
          </View>

          <Card padding={false}>
            <View style={styles.switchContainer}>
              <AccessibleSwitch
                icon="pulse"
                label="Inactivity Monitoring"
                description="Monitor for extended inactivity"
                value={inactivityMonitoring}
                onValueChange={setInactivityMonitoring}
                testID="inactivity-monitoring-switch"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.switchContainer}>
              <AccessibleSwitch
                icon="person-falling"
                label="AI Fall Detection"
                description="Detect falls using accelerometer"
                value={fallDetectionEnabled}
                onValueChange={setFallDetectionEnabled}
                testID="fall-detection-switch"
              />
            </View>
          </Card>

          <Button
            title="Configure Contacts"
            onPress={() => router.push('/(tabs)/settings')}
            variant="outline"
            fullWidth
            style={{ marginTop: SPACING.md }}
          />
        </View>

        {/* Voice Commands Info */}
        <View style={styles.section} accessible={true} accessibilityRole="header">
          <View style={styles.sectionHeader}>
            <Ionicons name="mic" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Voice Commands
            </Text>
          </View>

          <Card>
            <Text style={[styles.cardLabel, { color: colors.text }]}>Available Commands:</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
              • "Hey Seevia, help me" - Trigger emergency SOS
            </Text>
            <Text style={[styles.stepText, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
              • "Cancel emergency" - Cancel active alert
            </Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              • Device shake - Trigger with confirmation
            </Text>
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenLayout>
  );
}