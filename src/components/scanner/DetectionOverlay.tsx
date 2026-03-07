import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, TYPOGRAPHY } from '@/src/theme';

interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

interface DetectionOverlayProps {
  detections: DetectionBox[];
}

/**
 * Real-time AI Bounding Box Overlay for Seevia.
 * Visualizes YOLOv8 object detection results on the camera preview.
 */
export function DetectionOverlay({ detections }: DetectionOverlayProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((detection, index) => (
        <View
          key={`detection-${index}`}
          style={[
            styles.box,
            {
              left: `${detection.x * 100}%`,
              top: `${detection.y * 100}%`,
              width: `${detection.width * 100}%`,
              height: `${detection.height * 100}%`,
              borderColor: theme.primary, // Seevia Orange
            },
          ]}
        >
          <View style={[styles.labelContainer, { backgroundColor: theme.primary }]}>
            <Text style={styles.labelText}>
              {detection.label} {Math.round(detection.confidence * 100)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(234, 88, 12, 0.1)', // Subtle Orange tint
  },
  labelContainer: {
    position: 'absolute',
    top: -22,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  labelText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
