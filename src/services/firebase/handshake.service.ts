import { TrustCircleService, TrustCircle, TrustCircleStatus } from './trustCircle.service';
import { UserProfileService, UserProfile } from './userProfile.service';
import { AuthService } from './auth.service';
import { logger } from '@/utils/logger';
// 🛠️ FIX: Cleaned up unused imports and brought in query tools for the expiry check
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

export interface HandshakeRequest {
  pwdId: string;
  caregiverId: string;
  invitationCode: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: any;
  expiresAt: any;
}

export interface HandshakeResult {
  success: boolean;
  trustCircle?: TrustCircle;
  error?: string;
}

export interface LinkingStatus {
  isLinked: boolean;
  trustCircle?: TrustCircle;
  pwdProfile?: UserProfile;
  caregiverProfile?: UserProfile;
  canLink: boolean;
  pendingInvitations?: HandshakeRequest[];
}

/**
 * Handshake Service
 * Manages the complete caregiver-PWD linking flow with invitation codes.
 */
export class HandshakeService {
  private static readonly MODULE = 'HANDSHAKE_SERVICE';
  private static readonly INVITATION_EXPIRY_HOURS = 24;
  private static readonly COLLECTION = 'handshake_requests';

  /**
   * PWD: Create and share invitation code
   */
  static async createInvitation(pwdId: string): Promise<{ invitationCode: string; expiresAt: Date }> {
    try {
      logger.info(this.MODULE, `Creating invitation for PWD: ${pwdId}`);

      const trustCircle = await TrustCircleService.createInvitation(pwdId);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.INVITATION_EXPIRY_HOURS);

      logger.info(this.MODULE, `Invitation created: ${trustCircle.invitationCode}`);
      logger.info(this.MODULE, `Expires at: ${expiresAt.toISOString()}`);

      return {
        invitationCode: trustCircle.invitationCode,
        expiresAt,
      };
    } catch (error: any) { // 🛠️ FIX: Strict mode typing
      logger.error(this.MODULE, 'Error creating invitation', error);
      throw new Error(`Failed to create invitation: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Caregiver: Accept invitation by code
   */
  static async acceptInvitation(
    caregiverId: string,
    invitationCode: string
  ): Promise<HandshakeResult> {
    try {
      logger.info(this.MODULE, `Caregiver ${caregiverId} accepting invitation: ${invitationCode}`);

      if (!this.isValidInvitationCode(invitationCode)) {
        return { success: false, error: 'Invalid invitation code format' };
      }

      const trustCircle = await TrustCircleService.acceptInvitation(caregiverId, invitationCode);

      if (!trustCircle) {
        return { success: false, error: 'Invitation not found or already accepted' };
      }

      await UserProfileService.linkCaregiver(trustCircle.pwdId, caregiverId);

      logger.info(this.MODULE, `Handshake successful: ${caregiverId} linked to ${trustCircle.pwdId}`);

      return { success: true, trustCircle };
    } catch (error: any) {
      logger.error(this.MODULE, 'Error accepting invitation', error);
      return { success: false, error: error.message || 'Failed to accept invitation' };
    }
  }

  /**
   * Get linking status for a user
   */
  static async getLinkingStatus(userId: string): Promise<LinkingStatus> {
    try {
      const profile = await UserProfileService.getUserProfile(userId);

      if (!profile) return { isLinked: false, canLink: false };

      const isPWD = profile.role === 'pwd';
      const isCaregiver = profile.role === 'caregiver';

      let trustCircle: TrustCircle | undefined;
      let pwdProfile: UserProfile | undefined;
      let caregiverProfile: UserProfile | undefined;

      if (isPWD) {
        trustCircle = await TrustCircleService.getActiveTrustCircle(userId) || undefined;
        if (trustCircle?.caregiverId) {
          caregiverProfile = await UserProfileService.getUserProfile(trustCircle.caregiverId) || undefined;
        }
      } else if (isCaregiver) {
        const trustCircles = await TrustCircleService.getCaregiverTrustCircles(userId);
        if (trustCircles.length > 0) {
          trustCircle = trustCircles[0];
          pwdProfile = await UserProfileService.getUserProfile(trustCircle.pwdId) || undefined;
        }
      }

      const isLinked = !!trustCircle && trustCircle.status === 'active';

      return {
        isLinked,
        trustCircle,
        pwdProfile,
        caregiverProfile,
        canLink: !isLinked,
      };
    } catch (error: any) {
      logger.error(this.MODULE, 'Error getting linking status', error);
      return { isLinked: false, canLink: false };
    }
  }

  /**
   * Revoke trust circle (unlink)
   */
  static async revokeLink(circleId: string, userId: string): Promise<HandshakeResult> {
    try {
      logger.info(this.MODULE, `User ${userId} revoking link: ${circleId}`);

      const trustCircle = await TrustCircleService.getActiveTrustCircle(userId);

      if (!trustCircle || trustCircle.circleId !== circleId) {
        return { success: false, error: 'Trust circle not found' };
      }

      const hasPermission = trustCircle.pwdId === userId || trustCircle.caregiverId === userId;
      if (!hasPermission) {
        return { success: false, error: 'You do not have permission to revoke this link' };
      }

      await TrustCircleService.revokeTrustCircle(circleId);

      // We rely on UserProfileService to clear the caregiverId, HandshakeService shouldn't manipulate 'users' DB directly.
      await UserProfileService.linkCaregiver(trustCircle.pwdId, '');

      logger.info(this.MODULE, `Link revoked: ${circleId}`);
      return { success: true };
    } catch (error: any) {
      logger.error(this.MODULE, 'Error revoking link', error);
      return { success: false, error: error.message || 'Failed to revoke link' };
    }
  }

  static isValidInvitationCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Check if invitation code is expired
   */
  static async isInvitationExpired(invitationCode: string): Promise<boolean> {
    try {
      // 🛠️ FIX: Actually query the database by the invitation code, NOT the PWD ID.
      const q = query(
        collection(db, 'trust_circle'), 
        where('invitationCode', '==', invitationCode)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return true; // Not found = expired/invalid
      }

      const docData = snapshot.docs[0].data();
      const createdAt = docData.createdAt?.toDate();
      
      if (!createdAt) return true;

      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      return hoursSinceCreation > this.INVITATION_EXPIRY_HOURS;
    } catch (error: any) {
      logger.error(this.MODULE, 'Error checking invitation expiry', error);
      return true;
    }
  }

  static async getPendingInvitations(caregiverId: string): Promise<HandshakeRequest[]> {
    return [];
  }

  static async verifyHandshake(pwdId: string, caregiverId: string): Promise<boolean> {
    try {
      const hasAccess = await TrustCircleService.hasAccess(caregiverId, pwdId);
      if (!hasAccess) return false;

      const pwdProfile = await UserProfileService.getUserProfile(pwdId);
      const caregiverProfile = await UserProfileService.getUserProfile(caregiverId);

      return !!pwdProfile && !!caregiverProfile;
    } catch (error: any) {
      logger.error(this.MODULE, 'Error verifying handshake', error);
      return false;
    }
  }

  static async getLinkedPWDs(caregiverId: string): Promise<UserProfile[]> {
    try {
      const trustCircles = await TrustCircleService.getCaregiverTrustCircles(caregiverId);
      const pwdProfiles: UserProfile[] = [];

      for (const trustCircle of trustCircles) {
        const profile = await UserProfileService.getUserProfile(trustCircle.pwdId);
        if (profile) pwdProfiles.push(profile);
      }

      return pwdProfiles;
    } catch (error: any) {
      logger.error(this.MODULE, 'Error getting linked PWDs', error);
      return [];
    }
  }

  static async getCaregiverForPWD(pwdId: string): Promise<UserProfile | null> {
    try {
      const trustCircle = await TrustCircleService.getActiveTrustCircle(pwdId);
      if (!trustCircle?.caregiverId) return null;

      return await UserProfileService.getUserProfile(trustCircle.caregiverId);
    } catch (error: any) {
      logger.error(this.MODULE, 'Error getting caregiver for PWD', error);
      return null;
    }
  }

  static onHandshakeStatusChanged(userId: string, callback: (status: LinkingStatus) => void): () => void {
    let unsubscribe: (() => void) | null = null;

    const checkStatus = async () => {
      const status = await this.getLinkingStatus(userId);
      callback(status);
    };

    checkStatus();

    unsubscribe = TrustCircleService.onTrustCircleChanged(userId, async () => {
      const status = await this.getLinkingStatus(userId);
      callback(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }

  static getHandshakeAnnouncement(
    event: 'invitation_created' | 'invitation_accepted' | 'link_revoked',
    language: 'en' | 'ur' = 'en'
  ): string {
    const messages = {
      en: {
        invitation_created: 'Your invitation code has been created. Share it with your caregiver.',
        invitation_accepted: 'Your caregiver has accepted your invitation. You are now connected.',
        link_revoked: 'Your connection with your caregiver has been removed.',
      },
      ur: {
        invitation_created: 'آپ کا دعوت نامہ کوڈ تیار ہو گیا ہے۔ اسے اپنے دیکھ بھال کے ساتھ شیئر کریں۔',
        invitation_accepted: 'آپ کے دیکھ بھال نے آپ کا دعوت نامہ قبول کر لیا ہے۔ آپ اب مربوط ہیں۔',
        link_revoked: 'آپ کا اپنے دیکھ بھال کے ساتھ کنکشن ختم کر دیا گیا ہے۔',
      },
    };
    return messages[language][event];
  }
}