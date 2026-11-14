import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
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

interface PWDTelemetry {
  batteryLevel: number;
  isCharging: boolean;
  networkType: 'wifi' | 'cellular' | 'none';
  lastLocation: string;
  fallDetectionActive: boolean;
  lastActive: number;
}

export default function PWDDetailScreen() {
  const router = useRouter();
  // Extract the dynamic parameters passed from the dashboard
  const { pwd_uid, pwd_name } = useLocalSearchParams<{ pwd_uid: string; pwd_name: string }>();
  
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<PWDTelemetry | null>(null);

  useEffect(() => {
    if (pwd_uid) {
      loadPWDDetails();
    }
  }, [pwd_uid]);

  const loadPWDDetails = async () => {
    try {
      setLoading(true);
      // Fetch the PWD's latest profile and telemetry from Firestore
      const doc = await FirestoreService.getDocument('users', pwd_uid);
      
      if (doc) {
        setTelemetry({
          batteryLevel: doc.batteryLevel || 85, // Fallback mock data if not set
          isCharging: doc.isCharging || false,
          networkType: doc.networkType || 'wifi',
          lastLocation: doc.lastLocation || 'F-7 Markaz, Islamabad',
          fallDetectionActive: doc.fallDetectionEnabled ?? true,
          lastActive: doc.lastActive || Date.now(),
        });
      }
      setLoading(false);
    } catch (error) {
      logger.error('PWD_DETAIL', `Failed to load data for ${pwd_uid}`, error);
      setLoading(false);
    }
  };

  const handlePingDevice = () => {
    Alert.alert("Ping Sent", `A silent health check has been sent to ${pwd_name}'s device.`);
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return theme.success;
    if (level > 20) return '#FFA500'; // Warning orange
    return theme.danger;
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 15 }}>Loading telemetry data...</Text>
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
          <Text style={[styles.title, { color: theme.text }]}>{pwd_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.success + '20' }]}>
            <Text style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}>ONLINE</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Device Health & Telemetry */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Device Health</Text>
        <Card style={styles.card}>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryItem}>
              <Ionicons 
                name={telemetry?.isCharging ? "battery-charging" : (telemetry?.batteryLevel && telemetry.batteryLevel > 50 ? "battery-full" : "battery-half")} 
                size={24} 
                color={getBatteryColor(telemetry?.batteryLevel || 0)} 
              />
              <Text style={[styles.telemetryText, { color: theme.text }]}>
                {telemetry?.batteryLevel}%
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Battery</Text>
            </View>

            <View style={styles.telemetryItem}>
              <Ionicons 
                name={telemetry?.networkType === 'wifi' ? "wifi" : "cellular"} 
                size={24} 
                color={theme.primary} 
              />
              <Text style={[styles.telemetryText, { color: theme.text }]}>
                {telemetry?.networkType === 'wifi' ? 'Wi-Fi' : '4G'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Network</Text>
            </View>

            <View style={styles.telemetryItem}>
              <Ionicons 
                name={telemetry?.fallDetectionActive ? "shield-checkmark" : "shield"} 
                size={24} 
                color={telemetry?.fallDetectionActive ? theme.success : theme.textTertiary} 
              />
              <Text style={[styles.telemetryText, { color: theme.text }]}>
                {telemetry?.fallDetectionActive ? 'Active' : 'Off'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Sensors</Text>
            </View>
          </View>
        </Card>

        {/* Location & Safety */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: SPACING.md }]}>Location & Safety</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={theme.danger} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Last Known Location</Text>
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>{telemetry?.lastLocation}</Text>
            </View>
          </View>
          <View style={styles.actionGrid}>
            <Button 
              title="Live Map" 
              variant="secondary" 
              onPress={() => {}} 
              style={styles.gridButton} 
            />
            <Button 
              title="Geofences" 
              variant="secondary" 
              onPress={() => {}} 
              style={styles.gridButton} 
            />
          </View>
        </Card>

        {/* Shared Services (Pantry & Shopping) */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: SPACING.md }]}>Shared Services</Text>
        <View style={styles.actionGrid}>
          <Card style={[styles.gridCard, { borderColor: theme.cardBorder }]}>
            <Ionicons name="nutrition" size={32} color={theme.primary} style={{ marginBottom: 10 }}/>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Pantry Hub</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 5 }}>View scanned items</Text>
            <Button title="Open" variant="outline" style={{ marginTop: 15 }} onPress={() => {}} />
          </Card>

          <Card style={[styles.gridCard, { borderColor: theme.cardBorder }]}>
            <Ionicons name="cart" size={32} color={theme.primary} style={{ marginBottom: 10 }}/>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Shopping List</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 5 }}>Add items to list</Text>
            <Button title="Open" variant="outline" style={{ marginTop: 15 }} onPress={() => {}} />
          </Card>
        </View>

        {/* Emergency Actions */}
        <View style={{ marginTop: SPACING.xl, marginBottom: 40 }}>
          <Button 
            title={`Ping ${pwd_name}'s Device`}
            variant="outline" 
            onPress={handlePingDevice} 
            style={{ marginBottom: 15 }}
          />
          <Button 
            title="Trigger Override Alarm" 
            variant="danger" 
            onPress={() => Alert.alert('Warning', 'This will bypass silent mode on their device and play a loud alarm. Continue?')} 
          />
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
  title: { ...TYPOGRAPHY.display, fontSize: 24, marginBottom: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  content: { padding: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.small, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  card: { marginBottom: SPACING.md },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  telemetryItem: { alignItems: 'center', gap: 4 },
  telemetryText: { fontWeight: '700', fontSize: 18, marginTop: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  gridButton: { flex: 1 },
  gridCard: { flex: 1, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
});