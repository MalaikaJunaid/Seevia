import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';

/**
 * Seevia Image Processing Utility
 * Prepares camera captures for AI Vision analysis and Cloud storage.
 */

export const imageProcessing = {
  /**
   * Resizes and compresses image for AI Analysis (Gemini/Google Vision)
   * Optimization: 1080p max width, 80% quality JPEG
   */
  async prepareForAI(uri: string) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Maintain aspect ratio
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      return {
        uri: result.uri,
        base64: result.base64, // Ready for API body
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Image Processing Error:', error);
      throw new Error('Failed to process image for analysis');
    }
  },

  /**
   * Generates a small thumbnail for the Pantry/Shopping List UI
   */
  async generateThumbnail(uri: string) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      return uri; // Fallback to original
    }
  },

  /**
   * Corrects orientation issues often found on older Android devices
   */
  async fixOrientation(uri: string) {
    return await ImageManipulator.manipulateAsync(
      uri,
      [], // No transformations, just re-saving fixes EXIF orientation
      { format: SaveFormat.JPEG }
    );
  }
};
