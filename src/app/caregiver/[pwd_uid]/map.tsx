import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

// Core Components
import ScreenLayout from '@/components/common/ScreenLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

// Theme & Services
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { logger } from '@/utils/logger';

// Default to F-7 Markaz coordinates for demo purposes
const DEFAULT_LATITUDE = 33.7225;
const DEFAULT_LONGITUDE = 73.0560;

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  isWithinSafeZone: boolean;
}

export default function PWDMapScreen() {
  const router = useRouter();
  const { pwd_uid, pwd_name } = useLocalSearchParams<{ pwd_uid: string; pwd_name: string }>();
  
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationData | null>(null);

  // Geofence settings (In a real app, this would be fetched from Firestore)
  const safeZone = {
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    radius: 500, // meters
  };

  useEffect(() => {
    if (pwd_uid) {
      loadLocationData();
    }
  }, [pwd_uid]);

  const loadLocationData = async () => {
    try {
      setLoading(true);
      // Fetch latest location from Firestore
      const doc = await FirestoreService.getDocument('users', pwd_uid);
      
      setLocation({
        latitude: doc?.latitude || DEFAULT_LATITUDE,
        longitude: doc?.longitude || DEFAULT_LONGITUDE,
        timestamp: doc?.lastActive || Date.now(),
        isWithinSafeZone: doc?.isWithinSafeZone ?? true,
      });
      
      setLoading(false);
    } catch (error) {
      logger.error('MAP_SCREEN', 'Failed to load location', error);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadLocationData();
    Alert.alert("Location Updated", `Attempted to fetch latest coordinates for ${pwd_name}.`);
  };

  const handleSetGeofence = () => {
    Alert.alert(
      "Update Safe Zone", 
      "Would you like to set the current location as the center of the new Safe Zone?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Update", onPress: () => Alert.alert("Success", "Safe zone updated.") }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 15 }}>Locating device...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || DEFAULT_LATITUDE,
          longitude: location?.longitude || DEFAULT_LONGITUDE,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        // Use PROVIDER_GOOGLE if testing on Android emulator without Google Play Services
        userInterfaceStyle="dark"
        showsUserLocation={false} 
      >
        {/* PWD Current Location Marker */}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={pwd_name}
            description="Last known location"
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerDot, { backgroundColor: location.isWithinSafeZone ? theme.success : theme.danger }]} />
              <View style={styles.markerRing} />
            </View>
          </Marker>
        )}

        {/* Geofence Safe Zone Circle */}
        <Circle
          center={{ latitude: safeZone.latitude, longitude: safeZone.longitude }}
          radius={safeZone.radius}
          strokeWidth={2}
          strokeColor={theme.success}
          fillColor={theme.success + '20'} // 20 adds transparency to the hex code
        />
      </MapView>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <Button 
          title="" 
          variant="secondary" 
          icon={<Ionicons name="arrow-back" size={24} color={theme.text} />}
          onPress={() => router.back()} 
          style={styles.backButton}
        />
        <View style={styles.headerTitleCard}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{pwd_name}'s Location</Text>
        </View>
      </View>

      {/* Bottom Control Panel */}
      <View style={styles.bottomPanel}>
        <Card style={styles.controlCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusTextContainer}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Status</Text>
              <Text style={{ 
                color: location?.isWithinSafeZone ? theme.success : theme.danger, 
                fontWeight: '800', 
                fontSize: 18 
              }}>
                {location?.isWithinSafeZone ? "Inside Safe Zone" : "Outside Safe Zone!"}
              </Text>
            </View>
            <Button 
              title="" 
              variant="outline" 
              icon={<Ionicons name="refresh" size={20} color={theme.primary} />} 
              onPress={handleRefresh}
              style={{ paddingHorizontal: 15 }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.timestampRow}>
            <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, marginLeft: 5, fontSize: 13 }}>
              Last updated: {new Date(location?.timestamp || Date.now()).toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.actionGrid}>
            <Button 
              title="Navigate" 
              variant="primary" 
              icon={<Ionicons name="navigate" size={18} color="#FFF" />}
              onPress={() => {}} 
              style={styles.gridButton} 
            />
            <Button 
              title="Set Safe Zone" 
              variant="secondary" 
              icon={<Ionicons name="shield-checkmark" size={18} color={theme.text} />}
              onPress={handleSetGeofence} 
              style={styles.gridButton} 
            />
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  
  // Custom Marker
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  markerDot: { width: 16, height: 16, borderRadius: 8, position: 'absolute', zIndex: 2, borderWidth: 2, borderColor: '#FFF' },
  markerRing: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0, 122, 255, 0.3)', position: 'absolute', zIndex: 1 },

  // Floating UI
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  backButton: { width: 50, height: 50, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center', borderRadius: 25 },
  headerTitleCard: { flex: 1, backgroundColor: theme.card, borderRadius: 25, justifyContent: 'center', paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  headerTitle: { ...TYPOGRAPHY.subheading, fontWeight: '700' },

  bottomPanel: {
    position: 'absolute',
    bottom: 30,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  controlCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTextContainer: { flex: 1 },
  divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 15 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  actionGrid: { flexDirection: 'row', gap: 10 },
  gridButton: { flex: 1 },
});