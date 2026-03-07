import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from './config';
import { logger } from '@/src/utils/logger';

export class StorageService {
  private static readonly MODULE = 'STORAGE_SERVICE';

  /**
   * Uploads an image to Firebase Storage with progress tracking
   */
  static async uploadImage(
    blob: Blob,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => {
            logger.error(this.MODULE, 'Upload failed', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            logger.info(this.MODULE, `Upload complete: ${path}`);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      logger.error(this.MODULE, 'Error in uploadImage', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Deletes an image from storage using its URL
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
      logger.info(this.MODULE, 'Image deleted successfully');
    } catch (error) {
      logger.error(this.MODULE, 'Delete failed', error);
    }
  }

  /**
   * Helper to build a path: users/{userId}/pantry/{itemId}.jpg
   */
  static getPantryImagePath(userId: string, itemId: string): string {
    return `users/${userId}/pantry/${itemId}.jpg`;
  }
}
