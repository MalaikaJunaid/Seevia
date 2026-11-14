import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger } from '@/utils/logger';

export interface CompressedImageResult {
  base64: string;
  width: number;
  height: number;
  size: number; // Size in bytes
  format: string;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png';
  enableCompression?: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidth: 640,
  maxHeight: 640,
  quality: 0.7,
  format: 'jpeg',
  enableCompression: true,
};

/**
 * Image Compression Utility
 * Compresses camera captures to Base64 strings for Firestore storage.
 *
 * Features:
 * - Resize to max 640x640 (configurable)
 * - Compress to reduce file size
 * - Convert to Base64 for Firestore storage
 * - Support for JPEG and PNG formats
 */
export class ImageCompressionUtility {
  private static readonly MODULE = 'IMAGE_COMPRESSION';

  /**
   * Compress image from URI to Base64
   */
  static async compressImage(
    uri: string,
    options: CompressionOptions = {}
  ): Promise<CompressedImageResult> {
    const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

    try {
      logger.info(this.MODULE, `Starting compression for: ${uri}`);

      // Step 1: Get original image info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }

      const originalSize = fileInfo.size || 0;
      logger.info(this.MODULE, `Original size: ${this.formatBytes(originalSize)}`);

      // Step 2: Resize and compress
      const manipulated = await manipulateAsync(
        uri,
        [
          {
            resize: {
              width: opts.maxWidth,
              height: opts.maxHeight,
            },
          },
        ],
        {
          compress: opts.enableCompression,
          format: opts.format === 'jpeg' ? SaveFormat.JPEG : SaveFormat.PNG,
          quality: opts.quality,
        }
      );

      logger.info(this.MODULE, `Compressed to: ${manipulated.width}x${manipulated.height}`);

      // Step 3: Convert to Base64
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 4: Get compressed file info
      const compressedInfo = await FileSystem.getInfoAsync(manipulated.uri);
      const compressedSize = compressedInfo.size || 0;

      const compressionRatio = originalSize > 0 ? (compressedSize / originalSize) * 100 : 0;
      logger.info(
        this.MODULE,
        `Compressed size: ${this.formatBytes(compressedSize)} (${compressionRatio.toFixed(1)}% of original)`
      );

      // Step 5: Clean up temporary file
      try {
        await FileSystem.deleteAsync(manipulated.uri, { idempotent: true });
      } catch (cleanupError) {
        logger.warn(this.MODULE, 'Failed to cleanup temporary file', cleanupError);
      }

      return {
        base64,
        width: manipulated.width,
        height: manipulated.height,
        size: compressedSize,
        format: opts.format,
      };
    } catch (error) {
      logger.error(this.MODULE, 'Error compressing image', error);
      throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress image from camera result
   */
  static async compressCameraImage(
    cameraResult: any,
    options: CompressionOptions = {}
  ): Promise<CompressedImageResult> {
    const uri = cameraResult.uri || cameraResult.assets?.[0]?.uri;

    if (!uri) {
      throw new Error('No image URI found in camera result');
    }

    return this.compressImage(uri, options);
  }

  /**
   * Compress multiple images (batch processing)
   */
  static async compressImages(
    uris: string[],
    options: CompressionOptions = {}
  ): Promise<CompressedImageResult[]> {
    const results: CompressedImageResult[] = [];

    for (let i = 0; i < uris.length; i++) {
      try {
        logger.info(this.MODULE, `Compressing image ${i + 1} of ${uris.length}`);
        const result = await this.compressImage(uris[i], options);
        results.push(result);
      } catch (error) {
        logger.error(this.MODULE, `Failed to compress image ${i + 1}`, error);
        // Continue with other images even if one fails
      }
    }

    return results;
  }

  /**
   * Validate Base64 string
   */
  static isValidBase64(base64: string): boolean {
    try {
      // Check if it's a valid Base64 string
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(base64)) {
        return false;
      }

      // Try to decode to verify
      const decoded = atob(base64);
      return decoded.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get Base64 data URI (with prefix)
   */
  static getDataUri(base64: string, format: string = 'jpeg'): string {
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Estimate Base64 string size in bytes
   */
  static estimateBase64Size(base64: string): number {
    // Base64 encodes 3 bytes into 4 characters
    return Math.floor(base64.length * 0.75);
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get optimal compression settings based on image purpose
   */
  static getCompressionSettings(purpose: 'thumbnail' | 'standard' | 'high-quality'): CompressionOptions {
    switch (purpose) {
      case 'thumbnail':
        return {
          maxWidth: 320,
          maxHeight: 320,
          quality: 0.6,
          format: 'jpeg',
          enableCompression: true,
        };
      case 'high-quality':
        return {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.9,
          format: 'jpeg',
          enableCompression: true,
        };
      case 'standard':
      default:
        return DEFAULT_COMPRESSION_OPTIONS;
    }
  }

  /**
   * Check if image size is within Firestore limits
   * Firestore document size limit is 1MB
   */
  static isWithinFirestoreLimit(base64: string): boolean {
    const estimatedSize = this.estimateBase64Size(base64);
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    return estimatedSize < MAX_SIZE;
  }

  /**
   * Compress image to fit within Firestore limit
   */
  static async compressToFirestoreLimit(
    uri: string,
    maxAttempts: number = 3
  ): Promise<CompressedImageResult> {
    let quality = 0.9;
    let result: CompressedImageResult | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        result = await this.compressImage(uri, {
          quality,
          format: 'jpeg',
          enableCompression: true,
        });

        if (this.isWithinFirestoreLimit(result.base64)) {
          logger.info(this.MODULE, `Image compressed within limit on attempt ${attempt + 1}`);
          return result;
        }

        // Reduce quality for next attempt
        quality -= 0.2;
        logger.info(this.MODULE, `Reducing quality to ${quality} for next attempt`);
      } catch (error) {
        logger.error(this.MODULE, `Attempt ${attempt + 1} failed`, error);
      }
    }

    throw new Error('Failed to compress image within Firestore limit');
  }
}

/**
 * Convenience function to compress image
 */
export async function compressImage(
  uri: string,
  options?: CompressionOptions
): Promise<CompressedImageResult> {
  return ImageCompressionUtility.compressImage(uri, options);
}

/**
 * Convenience function to compress camera image
 */
export async function compressCameraImage(
  cameraResult: any,
  options?: CompressionOptions
): Promise<CompressedImageResult> {
  return ImageCompressionUtility.compressCameraImage(cameraResult, options);
}