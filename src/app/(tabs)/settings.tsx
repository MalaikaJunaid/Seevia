import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BackHeader } from '../../src/components/common/BackHeader';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { ScreenLayout } from '../../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../../src/theme/colors';
import TtsService from '../../src/services/voice/TtsService';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../src/theme';

export default function SettingsScreen() {
  const [voicePitch, setVoicePitch] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [micSensitivity, setMicSensitivity] = useState<'Low' | 'Medium' | 'High'>('High');
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [voiceConfirmations, setVoiceConfirmations] = useState(true);
  const [fallDetection, setFallDetection] = useState(true);

  const handleTestVoice = () => {
    TtsService.speak(`This is a test of the Seevia voice at ${voicePitch} pitch.`);
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={theme.primary} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primaryLight }}
        thumbColor={value ? theme.primary : theme.textTertiary}
      />
    </View>
  );

  const RadioButton = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.radioButton,
        {
          backgroundColor: selected ? theme.primary : theme.card,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.radioLabel,
          { color: selected ? '#FFFFFF' : theme.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <BackHeader
        title="Settings"
        subtitle="Preferences and personalization"
        icon={<Ionicons name="settings" size={40} color={theme.primary} />}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-high" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Voice Settings
            </Text>
          </View>

          <Card>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Voice Pitch</Text>
            <View style={styles.radioGroup}>
              {['Low', 'Medium', 'High'].map((p) => (
                <RadioButton
                  key={p}
                  label={p}
                  selected={voicePitch === p}
                  onPress={() => setVoicePitch(p as any)}
                />
              ))}
            </View>
            <Button
              title="Test Voice"
              onPress={handleTestVoice}
              variant="outline"
              fullWidth
              style={{ marginTop: SPACING.md }}
            />
          </Card>
        </View>

        {/* Microphone Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mic" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Microphone Sensitivity
            </Text>
          </View>

          <Card>
            <View style={styles.radioGroup}>
              {['Low', 'Medium', 'High'].map((s) => (
                <RadioButton
                  key={s}
                  label={s}
                  selected={micSensitivity === s}
                  onPress={() => setMicSensitivity(s as any)}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* General Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              System Preferences
            </Text>
          </View>

          <Card padding={false}>
            <SettingRow
              icon="phone-portrait"
              title="Haptic Feedback"
              subtitle="Vibration guidance for shopping"
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <SettingRow
              icon="volume-medium"
              title="Voice Confirmations"
              subtitle="Announce identified products"
              value={voiceConfirmations}
              onValueChange={setVoiceConfirmations}
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <SettingRow
              icon="shield-checkmark"
              title="AI Fall Detection"
              subtitle="Monitor movement for accidents"
              value={fallDetection}
              onValueChange={setFallDetection}
            />
          </Card>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={20} color={theme.danger} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Emergency Hub
            </Text>
          </View>

          <Card>
            <TouchableOpacity style={styles.emergencyButton}>
              <Ionicons name="call" size={20} color={theme.text} />
              <Text style={[styles.emergencyText, { color: theme.text }]}>
                Manage Contacts
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { padding: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.subheading, marginLeft: SPACING.sm },
  cardLabel: { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: SPACING.sm },
  radioGroup: { flexDirection: 'row', gap: SPACING.sm },
  radioButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  radioLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: SPACING.md },
  settingText: { flex: 1 },
  settingTitle: { ...TYPOGRAPHY.body, fontWeight: '600' },
  settingSubtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },
  divider: { height: 1, marginLeft: 60 },
  emergencyButton: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  emergencyText: { ...TYPOGRAPHY.body, flex: 1, marginLeft: SPACING.md },
});
