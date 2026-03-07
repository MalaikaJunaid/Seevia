import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView as ExpoCamera, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING } from '@/src/theme';
import { DetectionOverlay } from './DetectionOverlay';
import { EmptyState } from '../common/EmptyState';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface CameraViewProps {
  isScanning: boolean;
  detections: any[];
  onCapture: (uri: string) => void;
}

/**
 * Seevia Vision Interface.
 * Managed camera stream with integrated YOLO detection overlays.
 */
export function CameraView({ isScanning, detections, onCapture }: CameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<ExpoCamera | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) return <View style={styles.placeholder} />;

  if (!permission.granted) {
    return (
      <EmptyState
        icon="camera-reverse-outline"
        title="Camera Access Required"
        message="Seevia needs camera access to identify products for you."
        actionLabel="Grant Permission"
        onAction={requestPermission}
      />
    );
  }

  const handleCapture = async () => {
    if (cameraRef && !isScanning) {
      HapticFeedback.heavyTap();
      const photo = await cameraRef.takePictureAsync({ quality: 0.7, base64: true });
      if (photo) onCapture(photo.uri);
    }
  };

  return (
    <View style={styles.container}>
      <ExpoCamera
        style={styles.camera}
        facing="back"
        ref={(ref) => setCameraRef(ref)}
      >
        {/* Real-time YOLO Bounding Boxes */}
        <DetectionOverlay detections={detections} />

        {/* Viewfinder Guide */}
        <View style={styles.overlay}>
          <View style={[styles.reticle, { borderColor: theme.primary }]} />
        </View>

        {/* Camera Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.captureBtn, { backgroundColor: theme.primary }]} 
            onPress={handleCapture}
          >
            <View style={styles.innerBtn} />
          </TouchableOpacity>
        </View>
      </ExpoCamera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  reticle: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    borderStyle: 'dashed',
  },
  controls: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignSelf: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  }
});
