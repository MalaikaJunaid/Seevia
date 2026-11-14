import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import {
  compressImage,
  compressCameraImage,
  ImageCompressionUtility,
} from '@/utils/imageCompression';
import { DARK_THEME as theme } from '@/theme/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: theme.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '600',
  },
  compressionBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  compressionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

interface CompressedImageData {
  base64: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Image Compressor Component
 * Demonstrates usage of the image compression utility
 */
export function ImageCompressor() {
  const [compressedImage, setCompressedImage] = useState<CompressedImageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [originalSize, setOriginalSize] = useState<number>(0);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await compressAndDisplay(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await compressAndDisplay(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const compressAndDisplay = async (uri: string) => {
    try {
      setLoading(true);

      // Get original file size
      const fileInfo = await require('expo-file-system').FileSystem.getInfoAsync(uri);
      setOriginalSize(fileInfo.size || 0);

      // Compress image
      const compressed = await compressImage(uri, {
        maxWidth: 640,
        maxHeight: 640,
        quality: 0.7,
        format: 'jpeg',
      });

      setCompressedImage(compressed);

      // Check if within Firestore limit
      const withinLimit = ImageCompressionUtility.isWithinFirestoreLimit(compressed.base64);

      if (!withinLimit) {
        Alert.alert(
          'Warning',
          'Image is too large for Firestore. Consider using lower quality settings.'
        );
      }
    } catch (error) {
      console.error('Error compressing image:', error);
      Alert.alert('Error', 'Failed to compress image');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCompressionRatio = (): number => {
    if (!compressedImage || originalSize === 0) return 0;
    return ((compressedImage.size / originalSize) * 100);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Compressor</Text>
      <Text style={styles.subtitle}>
        Compress images to Base64 for Firestore storage
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Compressing...</Text>
        </View>
      )}

      {compressedImage && !loading && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${compressedImage.base64}` }}
            style={styles.previewImage}
          />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dimensions:</Text>
            <Text style={styles.infoValue}>
              {compressedImage.width}x{compressedImage.height}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Original Size:</Text>
            <Text style={styles.infoValue}>{formatBytes(originalSize)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Compressed Size:</Text>
            <Text style={styles.infoValue}>{formatBytes(compressedImage.size)}</Text>
          </View>

          <View style={styles.compressionBadge}>
            <Text style={styles.compressionBadgeText}>
              {getCompressionRatio().toFixed(1)}% of original
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base64 Length:</Text>
            <Text style={styles.infoValue}>{compressedImage.base64.length} chars</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Format:</Text>
            <Text style={styles.infoValue}>{compressedImage.format.toUpperCase()}</Text>
          </View>
        </View>
      )}

      {!compressedImage && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Select an image or take a photo to compress it
          </Text>
        </View>
      )}
    </View>
  );
}