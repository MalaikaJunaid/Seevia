import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  QueryConstraint 
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';

export class FirestoreService {
  private static readonly MODULE = 'FIRESTORE_SERVICE';

  /**
   * Universal method to get a single document.
   * By explicitly separating collectionPath and documentId, we prevent the "odd/even segments" Firebase crash.
   * 
   * @param collectionPath The path to the collection (e.g., 'dietary_profiles' or 'users/123/items')
   * @param documentId The specific document ID
   */
  static async getDocument<T>(collectionPath: string, documentId: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // 🛠️ FIX: Added 'as unknown as T' to prevent strict overlap type errors
        return { id: docSnap.id, ...docSnap.data() } as unknown as T;
      }
      return null;
    } catch (error: any) { // 🛠️ FIX: Explicit 'any' typing
      logger.error(this.MODULE, `Error fetching ${collectionPath}/${documentId}`, error);
      throw error;
    }
  }

  /**
   * Creates or updates a document, merging with existing data if it exists.
   */
  static async setDocument(collectionPath: string, documentId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      // { merge: true } ensures we don't accidentally wipe out other fields
      await setDoc(docRef, data, { merge: true });
    } catch (error: any) { // 🛠️ FIX: Explicit 'any' typing
      logger.error(this.MODULE, `Error setting ${collectionPath}/${documentId}`, error);
      throw error;
    }
  }

  /**
   * Strictly updates an existing document. Will fail if the document does not exist.
   */
  static async updateDocument(collectionPath: string, documentId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      await updateDoc(docRef, data);
    } catch (error: any) { // 🛠️ FIX: Explicit 'any' typing
      logger.error(this.MODULE, `Error updating ${collectionPath}/${documentId}`, error);
      throw error;
    }
  }

  /**
   * Deletes a document.
   */
  static async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      await deleteDoc(docRef);
    } catch (error: any) { // 🛠️ FIX: Explicit 'any' typing
      logger.error(this.MODULE, `Error deleting ${collectionPath}/${documentId}`, error);
      throw error;
    }
  }

  /**
   * Queries a collection for multiple documents using constraints (e.g., where('userId', '==', id)).
   */
  static async queryDocuments<T>(collectionPath: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const collRef = collection(db, collectionPath);
      const q = query(collRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as T[]; // 🛠️ FIX: Added 'as unknown' safety cast
    } catch (error: any) { // 🛠️ FIX: Explicit 'any' typing
      logger.error(this.MODULE, `Error querying ${collectionPath}`, error);
      throw error;
    }
  }

  /**
   * Helper utility to generate a safe subcollection path.
   * Returns an odd number of segments (valid Collection Path): 'users/UID/collectionName'
   */
  static getUserCollectionPath(userId: string, collectionName: string): string {
    return `users/${userId}/${collectionName}`;
  }
}