import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanningResult, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Components & Theme
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { LoadingSpinner } from '../src/components/common/LoadingSpinner';
import { ScreenLayout } from '../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../src/theme/colors';
import TtsService from '../src/services/voice/TtsService';
import VisionController from '../src/services/shopping/VisionController';
import HapticFeedback from '../src/services/shopping/HapticFeedback';
import { RADIUS, SPACING, TYPOGRAPHY } from '../src/theme';

type ScanMode = 'barcode' | 'product' | 'ocr';

export default function ScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [detectedProduct, setDetectedProduct] = useState<any | null>(null);
  const [showResult, setShowResult] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Audit log: Voice announcement for current mode
    TtsService.speak(`${mode} mode active.`);
  }, [mode]);

  useEffect(() => {
    if (showResult) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showResult]);

  const handleBarCodeScanned = async (result: BarCodeScanningResult) => {
    if (isProcessing || mode !== 'barcode' || showResult) return;

    try {
      setIsProcessing(true);
      TtsService.speak('Barcode detected. Fetching product data.');
      
      // Integration with Module 4 Vision Controller (Tier 1: OCR/Barcode)
      const product = await VisionController.analyzeFrame(result.data); // result.data contains barcode string
      
      if (product) {
        setDetectedProduct(product);
        setShowResult(true);
        HapticFeedback.itemFound();
      }
    } catch (error) {
      TtsService.speak('Scan failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      TtsService.speak('Capturing and identifying...');
      
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });

      // Integration with Module 4 Vision Pipeline (YOLO & Gemini Fallback)
      const result = await VisionController.analyzeFrame(photo.uri);
      
      if (result) {
        setDetectedProduct(result);
        setShowResult(true);
        HapticFeedback.itemFound();
      } else {
        TtsService.speak('Identification failed. Please move closer.');
      }
    } catch (error) {
      TtsService.speak('Camera error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setShowResult(false);
    setDetectedProduct(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={mode === 'barcode' ? handleBarCodeScanned : undefined}
      >
        {/* Header Overlay */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{mode.toUpperCase()}</Text>
        </View>

        {/* Scanning Reticle */}
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
        </View>

        {/* Mode Switcher Footer */}
        <View style={styles.modeSwitcher}>
          {['barcode', 'product', 'ocr'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, mode === m && { backgroundColor: theme.primary }]}
              onPress={() => setMode(m as ScanMode)}
            >
              <Text style={[styles.modeText, { color: '#FFF' }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Button for Manual Modes */}
        {mode !== 'barcode' && (
          <TouchableOpacity style={[styles.captureBtn, { backgroundColor: theme.primary }]} onPress={handleCapturePhoto}>
             <Ionicons name="camera" size={32} color="#FFF" />
          </TouchableOpacity>
        )}
      </CameraView>

      {/* Result Overlay Card */}
      {showResult && detectedProduct && (
        <Animated.View style={[styles.resultOverlay, { opacity: fadeAnim }]}>
          <Card style={styles.resultCard}>
            <Text style={[styles.productName, { color: theme.text }]}>{detectedProduct.label}</Text>
            <Text style={[styles.productSource, { color: theme.primary }]}>Source: {detectedProduct.source}</Text>
            <Button title="Close" onPress={handleClose} style={{ marginTop: 20 }} />
          </Card>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  closeButton: { padding: 5 },
  scanFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '40%',
  },
  corner: { position: 'absolute', width: 40, height: 40, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  modeSwitcher: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 10
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modeText: { fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  captureBtn: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  resultCard: { width: '100%', padding: 30, alignItems: 'center' },
  productName: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  productSource: { fontSize: 14, fontWeight: '700', marginTop: 10, textTransform: 'uppercase' }
});
