import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Services & Theme
import { DARK_THEME as theme } from '../../src/theme/colors';
import VisionController from '../../src/services/shopping/VisionController';
import HapticFeedback from '../../src/services/shopping/HapticFeedback';
import TtsService from '../../src/services/voice/TtsService';
import { ScreenLayout } from '../../src/components/common/ScreenLayout';

export default function ShoppingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [identifiedItem, setIdentifiedItem] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text, textAlign: 'center' }}>We need your camera permission to identify products.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={{ color: '#FFF' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async () => {
    if (cameraRef.current) {
      // 1. Capture Frame
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      
      // 2. Process via 3-Tier Pipeline
      const result = await VisionController.analyzeFrame(photo.uri);
      
      if (result) {
        setIdentifiedItem(result.label);
        setActiveTier(result.source); // e.g., "YOLO" or "Gemini"
        HapticFeedback.itemFound();
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CameraView style={styles.camera} ref={cameraRef}>
        {/* Tier Identification Overlay */}
        <View style={styles.overlay}>
          {activeTier && (
            <View style={[styles.tierBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.tierText}>Source: {activeTier}</Text>
            </View>
          )}
          
          <View style={[styles.resultCard, { backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: theme.primary }]}>
            <Text style={[styles.label, { color: theme.text }]}>
              {identifiedItem || "Aim at a product..."}
            </Text>
          </View>
        </View>

        {/* Scan Trigger */}
        <TouchableOpacity 
          style={[styles.scanCircle, { borderColor: theme.primary }]} 
          onPress={handleScan}
        >
          <View style={[styles.scanInner, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    top: 60,
    width: '90%',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  tierText: { color: '#FFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  resultCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  label: { fontSize: 24, fontWeight: 'bold' },
  scanCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  scanInner: { width: 64, height: 64, borderRadius: 32 },
  permissionBtn: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#EA580C',
    borderRadius: 10,
  }
});
