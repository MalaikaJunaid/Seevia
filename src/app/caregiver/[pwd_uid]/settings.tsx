import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Switch, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Core Components
import ScreenLayout from '@/components/common/ScreenLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

// Theme & Services
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { logger } from '@/utils/logger';

interface PWDSettings {
  notifyOnFall: boolean;
  notifyOnLowBattery: boolean;
  batteryThreshold: number;
  notifyOnGeofenceExit: boolean;
  smsFallbackEnabled: boolean;
}

export default function PWDSettingsScreen() {
  const router = useRouter();
  const { pwd_uid, pwd_name } = useLocalSearchParams<{ pwd_uid: string; pwd_name: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PWDSettings>({
    notifyOnFall: true,
    notifyOnLowBattery: true,
    batteryThreshold: 15,
    notifyOnGeofenceExit: true,
    smsFallbackEnabled: true,
  });

  useEffect(() => {
    if (pwd_uid) {
      loadSettings();
    }
  }, [pwd_uid]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, fetch caregiver-specific preferences for this PWD
      // const doc = await FirestoreService.getDocument('trust_circle_settings', `${caregiver_uid}_${pwd_uid}`);
      
      // Simulating network request for FYP presentation
      setTimeout(() => {
        setLoading(false);
      }, 600);
    } catch (error) {
      logger.error('SETTINGS_SCREEN', 'Failed to load settings', error);
      setLoading(false);
    }
  };

  const toggleSetting = (key: keyof PWDSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Success", "Notification preferences updated.");
    }, 800);
  };

  const handleUnlink = () => {
    Alert.alert(
      "Unlink Device",
      `Are you sure you want to disconnect from ${pwd_name}? You will no longer receive emergency alerts or telemetry data.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Unlink", 
          style: "destructive", 
          onPress: () => {
            // Remove from trust_circle in Firestore
            Alert.alert("Disconnected", `You have been unlinked from ${pwd_name}.`);
            router.replace('/caregiver/dashboard');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 15 }}>Loading preferences...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false} padding={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Button 
          title="Back" 
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>
            Alerts for {pwd_name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Urgent Alerts Configuration */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Safety Alerts</Text>
        <Card style={styles.card}>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="body-outline" size={22} color={theme.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Fall Detection Alerts</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Receive immediate push notifications if Edge AI detects a fall.
                </Text>
              </View>
            </View>
            <Switch 
              trackColor={{ false: theme.cardBorder, true: theme.primary }}
              thumbColor={'#FFF'}
              onValueChange={() => toggleSetting('notifyOnFall')}
              value={settings.notifyOnFall}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="map-outline" size={22} color={theme.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Geofence Alerts</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Notify me when they leave the designated Safe Zone.
                </Text>
              </View>
            </View>
            <Switch 
              trackColor={{ false: theme.cardBorder, true: theme.primary }}
              thumbColor={'#FFF'}
              onValueChange={() => toggleSetting('notifyOnGeofenceExit')}
              value={settings.notifyOnGeofenceExit}
            />
          </View>
        </Card>

        {/* Telemetry & Device Health */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Device Health</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="battery-dead-outline" size={22} color={theme.danger} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Critical Battery Warning</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Alert me when their phone drops below {settings.batteryThreshold}%.
                </Text>
              </View>
            </View>
            <Switch 
              trackColor={{ false: theme.cardBorder, true: theme.danger }}
              thumbColor={'#FFF'}
              onValueChange={() => toggleSetting('notifyOnLowBattery')}
              value={settings.notifyOnLowBattery}
            />
          </View>
        </Card>

        {/* Offline Fallback Configuration */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Connectivity</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.success} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Offline SMS Fallback</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  If 4G fails, Seevia will send emergency alerts and GPS coordinates via standard SMS.
                </Text>
              </View>
            </View>
            <Switch 
              trackColor={{ false: theme.cardBorder, true: theme.success }}
              thumbColor={'#FFF'}
              onValueChange={() => toggleSetting('smsFallbackEnabled')}
              value={settings.smsFallbackEnabled}
            />
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button 
            title={saving ? "Saving..." : "Save Preferences"} 
            variant="primary" 
            onPress={handleSaveSettings}
            disabled={saving}
            style={{ marginBottom: 15 }}
          />
          
          <Button 
            title={`Unlink from ${pwd_name}`}
            variant="danger" 
            icon={<Ionicons name="trash-outline" size={18} color="#FFF" />}
            onPress={handleUnlink}
          />
          <Text style={{ color: theme.textTertiary, textAlign: 'center', marginTop: 10, fontSize: 12 }}>
            Unlinking will permanently remove your access to this user's telemetry and emergency alerts.
          </Text>
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: SPACING.lg,
    paddingTop: 50,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: { paddingHorizontal: 15, paddingVertical: 8, height: 'auto' },
  headerTitleContainer: { flex: 1 },
  title: { ...TYPOGRAPHY.display, fontSize: 24, marginBottom: 2 },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  
  sectionTitle: { ...TYPOGRAPHY.small, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, marginTop: 10, textTransform: 'uppercase' },
  card: { padding: SPACING.md, marginBottom: SPACING.lg },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  settingInfo: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 15 },
  settingTextContainer: { marginLeft: 15, flex: 1 },
  settingLabel: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: 4 },
  settingDescription: { ...TYPOGRAPHY.caption, lineHeight: 18 },
  
  divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 15 },
  
  actionSection: { marginTop: SPACING.xl, marginBottom: SPACING.xxl },
});