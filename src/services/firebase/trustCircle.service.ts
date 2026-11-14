import {
  collection,
  doc,
  getDocs, // 🛠️ FIX: Changed from getDoc to getDocs for queries
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';

export type TrustCircleStatus = 'active' | 'pending' | 'rejected';

export interface TrustCircle {
  circleId: string;
  pwdId: string;
  caregiverId: string;
  status: TrustCircleStatus;
  invitationCode: string;
  createdAt: any;
  updatedAt: any;
}

export class TrustCircleService {
  private static readonly MODULE = 'TRUST_CIRCLE_SERVICE';
  private static readonly COLLECTION = 'trust_circle';

  /**
   * Generate a 6-digit invitation code
   */
  private static generateInvitationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new trust circle invitation
   */
  static async createInvitation(pwdId: string): Promise<TrustCircle> {
    try {
      const invitationCode = this.generateInvitationCode();
      const circleId = `${pwdId}_${Date.now()}`;

      const trustCircle: TrustCircle = {
        circleId,
        pwdId,
        caregiverId: '',
        status: 'pending',
        invitationCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, this.COLLECTION, circleId), trustCircle);
      logger.info(this.MODULE, `Created invitation for PWD: ${pwdId}, Code: ${invitationCode}`);

      return trustCircle;
    } catch (error: any) { // 🛠️ FIX: Typed error as any to access error.message safely
      logger.error(this.MODULE, 'Error creating invitation', error);
      throw new Error(`Failed to create invitation: ${error.message}`);
    }
  }

  /**
   * Accept invitation by code (Caregiver side)
   */
  static async acceptInvitation(
    caregiverId: string,
    invitationCode: string
  ): Promise<TrustCircle | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('invitationCode', '==', invitationCode),
        where('status', '==', 'pending')
      );

      // 🛠️ FIX: Use getDocs for queries
      const querySnapshot = await getDocs(q);
      let trustCircleDoc: any = null;

      querySnapshot.forEach((doc) => {
        trustCircleDoc = { id: doc.id, ...doc.data() };
      });

      if (!trustCircleDoc) {
        logger.warn(this.MODULE, `No pending invitation found with code: ${invitationCode}`);
        return null;
      }

      const circleRef = doc(db, this.COLLECTION, trustCircleDoc.id);
      await updateDoc(circleRef, {
        caregiverId,
        status: 'active',
        updatedAt: serverTimestamp(),
      });

      logger.info(this.MODULE, `Invitation accepted by caregiver: ${caregiverId}`);

      return { ...trustCircleDoc, caregiverId, status: 'active' } as TrustCircle;
    } catch (error: any) {
      logger.error(this.MODULE, 'Error accepting invitation', error);
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  /**
   * Get active trust circle for a PWD
   */
  static async getActiveTrustCircle(pwdId: string): Promise<TrustCircle | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('pwdId', '==', pwdId),
        where('status', '==', 'active')
      );

      // 🛠️ FIX: Use getDocs for queries
      const querySnapshot = await getDocs(q);
      let trustCircleDoc: any = null;

      querySnapshot.forEach((doc) => {
        trustCircleDoc = { id: doc.id, ...doc.data() };
      });

      return trustCircleDoc ? (trustCircleDoc as TrustCircle) : null;
    } catch (error) {
      logger.error(this.MODULE, 'Error getting active trust circle', error);
      return null;
    }
  }

  /**
   * Get trust circles for a caregiver
   */
  static async getCaregiverTrustCircles(caregiverId: string): Promise<TrustCircle[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );

      // 🛠️ FIX: Use getDocs for queries
      const querySnapshot = await getDocs(q);
      const trustCircles: TrustCircle[] = [];

      querySnapshot.forEach((doc) => {
        trustCircles.push({ id: doc.id, ...doc.data() } as unknown as TrustCircle);
      });

      return trustCircles;
    } catch (error) {
      logger.error(this.MODULE, 'Error getting caregiver trust circles', error);
      return [];
    }
  }

  /**
   * Check if caregiver has access to PWD's data
   */
  static async hasAccess(caregiverId: string, pwdId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('pwdId', '==', pwdId),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );

      // 🛠️ FIX: Use getDocs for queries
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      logger.error(this.MODULE, 'Error checking access', error);
      return false;
    }
  }

  /**
   * Real-time listener for trust circle changes
   */
  static onTrustCircleChanged(
    pwdId: string,
    callback: (trustCircle: TrustCircle | null) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION),
      where('pwdId', '==', pwdId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        callback({ id: doc.id, ...doc.data() } as unknown as TrustCircle);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  /**
   * Revoke trust circle
   */
  static async revokeTrustCircle(circleId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, circleId));
      logger.info(this.MODULE, `Trust circle revoked: ${circleId}`);
    } catch (error: any) {
      logger.error(this.MODULE, 'Error revoking trust circle', error);
      throw new Error(`Failed to revoke trust circle: ${error.message}`);
    }
  }
}