import {
    collection,
    deleteDoc,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    query,
    QueryConstraint,
    setDoc,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/src/utils/logger';

export class FirestoreService {
  private static readonly MODULE = 'FIRESTORE_SERVICE';

  /**
   * Create or update a document with automatic timestamping
   */
  static async setDocument<T extends DocumentData>(
    collectionPath: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
      logger.info(this.MODULE, `Document saved to ${collectionPath}/${docId}`);
    } catch (error) {
      logger.error(this.MODULE, 'Error setting document', error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  /**
   * Fetch a single document by ID
   */
  static async getDocument<T>(
    collectionPath: string,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Error getting document', error);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Perform a filtered query (e.g., getting only expired items)
   */
  static async queryDocuments<T>(
    collectionPath: string,
    constraints: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      logger.error(this.MODULE, 'Error querying documents', error);
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  /**
   * Delete a document (e.g., removing an item from the shopping list)
   */
  static async deleteDocument(
    collectionPath: string,
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
      logger.info(this.MODULE, `Document deleted: ${collectionPath}/${docId}`);
    } catch (error) {
      logger.error(this.MODULE, 'Error deleting document', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Utility to build the hierarchical path for user data
   */
  static getUserCollectionPath(userId: string, collectionName: string): string {
    return `users/${userId}/${collectionName}`;
  }
}
