/**
 * PWD Connection Service
 * Handles invitation code validation and caregiver-PWD linking
 * Optimized for both Production and FYP Demo scenarios
 */

import { where } from 'firebase/firestore'; // 🛠️ FIX: Moved import to top-level to prevent Metro bundler crashes
import { FirestoreService } from './firestore.service';
import { logger } from '@/utils/logger';

export interface PWDInvitationCode {
  code: string;
  pwd_uid: string;
  pwd_name: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface CaregiverPWDConnection {
  caregiver_uid: string;
  caregiver_name: string;
  pwd_uid: string;
  pwd_name: string;
  status: 'active' | 'pending' | 'declined' | 'pending_confirmation';
  created_at: number;
  verified_at?: number;
}

export class PWDConnectionService {
  private static readonly MODULE = 'PWD_CONNECTION_SERVICE';
  private static readonly INVITATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate a 6-digit alphanumeric invitation code
   */
  static generateInvitationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create invitation code in PWD user's account
   */
  static async createInvitationCode(pwd_uid: string, pwd_name: string): Promise<string> {
    try {
      const code = this.generateInvitationCode();
      const now = Date.now();

      await FirestoreService.setDocument('pwd_invitations', code, {
        code,
        pwd_uid,
        pwd_name,
        created_at: now,
        expires_at: now + this.INVITATION_EXPIRY_MS,
        used: false,
      });

      logger.info(this.MODULE, `Created invitation code for PWD ${pwd_uid}`);
      return code;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to create invitation code', error);
      throw error;
    }
  }

  /**
   * Validate and use invitation code
   * LOGIC: Checks for Demo Bypass BEFORE any network calls to prevent offline errors
   */
  static async validateAndUseCode(
    code: string,
    caregiver_uid: string,
    caregiver_name: string
  ): Promise<CaregiverPWDConnection> {
    const normalizedCode = code.toUpperCase().trim();

    // --- 1. HARDCODED DEMO BYPASS (PRIORITY) ---
    // This allows the demo to work even if the device is completely offline
    if (normalizedCode === 'SEE786' || normalizedCode === '123456') {
      logger.info(this.MODULE, '🤫 Demo Bypass: Returning mock PWD connection');
      
      return {
        caregiver_uid,
        caregiver_name,
        pwd_uid: 'demo_pwd_user_123',
        pwd_name: 'Demo PWD User',
        status: 'active', // Immediate activation for demo speed
        created_at: Date.now(),
        verified_at: Date.now(),
      };
    }

    // --- 2. PRODUCTION FIRESTORE LOGIC ---
    try {
      // 🛠️ FIX: Added 'as PWDInvitationCode | null' so TypeScript knows the exact properties
      const inviteDoc = await FirestoreService.getDocument('pwd_invitations', normalizedCode) as PWDInvitationCode | null;

      if (!inviteDoc) {
        throw new Error('Invitation code not found');
      }

      if (inviteDoc.used) {
        throw new Error('This invitation code has already been used');
      }

      if (inviteDoc.expires_at < Date.now()) {
        throw new Error('This invitation code has expired');
      }

      const connection: CaregiverPWDConnection = {
        caregiver_uid,
        caregiver_name,
        pwd_uid: inviteDoc.pwd_uid,
        pwd_name: inviteDoc.pwd_name,
        status: 'pending',
        created_at: Date.now(),
      };

      const connectionId = `${caregiver_uid}_${inviteDoc.pwd_uid}`;
      await FirestoreService.setDocument('trust_circle', connectionId, connection);
      await FirestoreService.updateDocument('pwd_invitations', normalizedCode, { used: true });

      const pwdConnectionId = `${inviteDoc.pwd_uid}_${caregiver_uid}`;
      await FirestoreService.setDocument('trust_circle', pwdConnectionId, {
        ...connection,
        status: 'pending_confirmation',
      });

      logger.info(this.MODULE, `Linked caregiver ${caregiver_uid} to PWD ${inviteDoc.pwd_uid}`);
      return connection;
    } catch (error: any) {
      logger.error(this.MODULE, 'Failed to validate invitation code', error);
      throw new Error(error.message || 'Invalid invitation code');
    }
  }

  /**
   * Fetch active connections for a caregiver
   */
  static async getCaregiverConnections(caregiver_uid: string): Promise<CaregiverPWDConnection[]> {
    try {
      // 🛠️ FIX: Uses top-level import to safely execute queries
      const connections = await FirestoreService.queryDocuments(
        'trust_circle',
        [
          where('caregiver_uid', '==', caregiver_uid),
          where('status', '==', 'active'),
        ]
      );
      return connections as CaregiverPWDConnection[];
    } catch (error) {
      logger.error(this.MODULE, 'Failed to fetch caregiver connections', error);
      return [];
    }
  }

  /**
   * Fetch pending requests for a PWD user
   */
  static async getPWDPendingRequests(pwd_uid: string): Promise<CaregiverPWDConnection[]> {
    try {
      // 🛠️ FIX: Uses top-level import to safely execute queries
      const requests = await FirestoreService.queryDocuments(
        'trust_circle',
        [
          where('pwd_uid', '==', pwd_uid),
          where('status', '==', 'pending_confirmation'),
        ]
      );
      return requests as CaregiverPWDConnection[];
    } catch (error) {
      logger.error(this.MODULE, 'Failed to fetch pending requests', error);
      return [];
    }
  }

  /**
   * Approve a caregiver request
   */
  static async approveCaregiverConnection(pwd_uid: string, caregiver_uid: string): Promise<void> {
    try {
      const connectionId = `${caregiver_uid}_${pwd_uid}`;
      const reverseId = `${pwd_uid}_${caregiver_uid}`;

      const updateData = { status: 'active', verified_at: Date.now() };

      await FirestoreService.updateDocument('trust_circle', connectionId, updateData);
      await FirestoreService.updateDocument('trust_circle', reverseId, updateData);

      logger.info(this.MODULE, `PWD approved caregiver ${caregiver_uid}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to approve connection', error);
      throw error;
    }
  }

  /**
   * Reject/Decline a caregiver request
   */
  static async rejectCaregiverConnection(pwd_uid: string, caregiver_uid: string): Promise<void> {
    try {
      const connectionId = `${caregiver_uid}_${pwd_uid}`;
      const reverseId = `${pwd_uid}_${caregiver_uid}`;

      await FirestoreService.updateDocument('trust_circle', connectionId, { status: 'declined' });
      await FirestoreService.updateDocument('trust_circle', reverseId, { status: 'declined' });

      logger.info(this.MODULE, `PWD rejected caregiver ${caregiver_uid}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to reject connection', error);
      throw error;
    }
  }
}