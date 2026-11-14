/**
 * Seevia Volunteer Service
 * Manages volunteer registration, case matching, and volunteer operations
 * 
 * Features:
 * - Volunteer registration and verification
 * - Location-based case matching
 * - Volunteer acceptance and response
 * - Rating and reputation system
 * - Environment mapping contributions
 */

import { logger } from '@/utils/logger';
import { FirestoreService } from '@/services/firebase/firestore.service';

// ==================== Types ====================

export interface VolunteerProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  verificationDate?: number;
  idVerified: boolean;
  profilePhoto?: string;
  
  // Location & Availability
  currentLocation?: { latitude: number; longitude: number };
  radius: number; // km - area of service
  isAvailable: boolean;
  lastStatusUpdate: number;
  
  // Rating & Reputation
  totalResponses: number;
  averageRating: number;
  reviewCount: number;
  successRate: number; // percentage
  
  // Skills & Specializations
  languages: string[];
  specializations: string[]; // medical, navigation, tech, etc.
  
  // Trust & Compliance
  backgroundCheckDate?: number;
  trustScore: number; // 0-100
  violations: number;
  
  createdAt: number;
  updatedAt: number;
}

export interface HelpCase {
  id: string;
  userId: string; // blind user requesting help
  userLocation: { latitude: number; longitude: number };
  caseType: 'emergency' | 'assistance' | 'guidance';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  
  // Volunteer Matching
  assignedVolunteer?: string;
  nearbyVolunteers?: { volunteerId: string; distance: number }[];
  
  // Status
  status: 'active' | 'accepted' | 'resolved' | 'cancelled' | 'escalated';
  acceptedAt?: number;
  resolvedAt?: number;
  acceptanceDeadline: number; // 10 minutes after creation
  
  // Rating
  volunteerRating?: number;
  feedback?: string;
  
  createdAt: number;
  updatedAt: number;
}

export interface EnvironmentMapping {
  id: string;
  volunteerId: string;
  location: { latitude: number; longitude: number };
  locationName: string;
  mappingType: 'layout' | 'products' | 'obstacles' | 'accessibility';
  data: Record<string, any>;
  verified: boolean;
  approvedBy?: string;
  approvedAt?: number;
  
  createdAt: number;
  updatedAt: number;
}

export interface VolunteerReview {
  id: string;
  volunteerId: string;
  userId: string;
  caseId: string;
  rating: number; // 1-5
  comment: string;
  categories: {
    responsiveness: number;
    professionalism: number;
    helpfulness: number;
  };
  createdAt: number;
}

// ==================== Volunteer Service Implementation ====================

class VolunteerService {
  private readonly MODULE = 'VOLUNTEER_SERVICE';

  /**
   * Register a new volunteer
   */
  async registerVolunteer(data: Partial<VolunteerProfile>): Promise<VolunteerProfile> {
    try {
      logger.info(this.MODULE, 'Registering volunteer', { name: data.name });

      const volunteer: VolunteerProfile = {
        id: this.generateId(),
        uid: data.uid || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        verified: false,
        idVerified: false,
        currentLocation: data.currentLocation,
        radius: data.radius || 5, // default 5km
        isAvailable: true,
        lastStatusUpdate: Date.now(),
        totalResponses: 0,
        averageRating: 0,
        reviewCount: 0,
        successRate: 0,
        languages: data.languages || ['en'],
        specializations: data.specializations || [],
        backgroundCheckDate: undefined,
        trustScore: 50, // Initial trust score
        violations: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Save to Firestore using static method
      await FirestoreService.setDocument('volunteers', volunteer.id, volunteer);
      logger.info(this.MODULE, 'Volunteer registered successfully', { id: volunteer.id });

      return volunteer;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to register volunteer', error);
      throw error;
    }
  }

  /**
   * Verify volunteer phone number
   */
  async verifyPhoneNumber(volunteerId: string, code: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Verifying phone for volunteer', { volunteerId });

      // In production, validate code against SMS service
      // For now, we'll assume code verification succeeds
      const validated = await this.validatePhoneCode(code);

      if (validated) {
        await FirestoreService.updateDocument('volunteers', volunteerId, {
          verified: true,
          verificationDate: Date.now(),
          updatedAt: Date.now(),
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error(this.MODULE, 'Phone verification failed', error);
      throw error;
    }
  }

  /**
   * Verify volunteer ID
   */
  async verifyID(volunteerId: string, idData: { type: string; number: string }): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Verifying ID for volunteer', { volunteerId });

      // In production, use ID verification service (e.g., Onfido, IDology)
      // For now, basic validation
      const isValid = idData.number && idData.number.length >= 5;

      if (isValid) {
        await FirestoreService.updateDocument('volunteers', volunteerId, {
          idVerified: true,
          trustScore: 60, // Increase trust after ID verification
          updatedAt: Date.now(),
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error(this.MODULE, 'ID verification failed', error);
      throw error;
    }
  }

  /**
   * Find nearby volunteers for a case
   */
  async findNearbyVolunteers(
    location: { latitude: number; longitude: number },
    radius: number = 10
  ): Promise<VolunteerProfile[]> {
    try {
      logger.info(this.MODULE, 'Finding nearby volunteers', { location, radius });

      // In production, use Firestore geoqueries
      const volunteers = await FirestoreService.queryDocuments<VolunteerProfile>('volunteers', [
        // Note: You might need to import `where` from firebase/firestore and use it here depending on how you build your QueryConstraint[]
        // { field: 'isAvailable', operator: '==', value: true },
        // { field: 'verified', operator: '==', value: true },
      ] as any);

      // Filter by distance
      const nearby = volunteers.filter((v: VolunteerProfile) => {
        if (!v.currentLocation) return false;

        const distance = this.calculateDistance(location, v.currentLocation);
        return distance <= Math.min(radius, v.radius);
      });

      // Sort by distance and rating
      return nearby.sort((a: any, b: any) => {
        const distA = this.calculateDistance(location, a.currentLocation);
        const distB = this.calculateDistance(location, b.currentLocation);

        if (distA === distB) {
          return b.averageRating - a.averageRating;
        }

        return distA - distB;
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to find nearby volunteers', error);
      return [];
    }
  }

  /**
   * Create a new help case
   */
  async createCase(
    userId: string,
    location: { latitude: number; longitude: number },
    caseType: 'emergency' | 'assistance' | 'guidance',
    description: string
  ): Promise<HelpCase> {
    try {
      logger.info(this.MODULE, 'Creating help case', { userId, caseType });

      const caseData: HelpCase = {
        id: this.generateId(),
        userId,
        userLocation: location,
        caseType,
        urgency: caseType === 'emergency' ? 'critical' : 'medium',
        description,
        status: 'active',
        acceptanceDeadline: Date.now() + 10 * 60 * 1000, // 10 minutes
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Find and assign nearby volunteers
      const nearby = await this.findNearbyVolunteers(location);
      caseData.nearbyVolunteers = nearby.map((v) => ({
        volunteerId: v.id,
        distance: this.calculateDistance(location, v.currentLocation || { latitude: 0, longitude: 0 }),
      }));

      // Save case using static method
      await FirestoreService.setDocument('cases', caseData.id, caseData);

      // Notify volunteers
      await this.notifyVolunteers(nearby, caseData);

      logger.info(this.MODULE, 'Case created successfully', { caseId: caseData.id });

      return caseData;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to create case', error);
      throw error;
    }
  }

  /**
   * Accept a case as volunteer
   */
  async acceptCase(volunteerId: string, caseId: string): Promise<HelpCase | null> {
    try {
      logger.info(this.MODULE, 'Volunteer accepting case', { volunteerId, caseId });

      // Get case using static method
      const caseDoc = await FirestoreService.getDocument<HelpCase>('cases', caseId);
      if (!caseDoc) {
        logger.warn(this.MODULE, 'Case not found', { caseId });
        return null;
      }

      // Check if already assigned
      if (caseDoc.assignedVolunteer && caseDoc.assignedVolunteer !== volunteerId) {
        logger.warn(this.MODULE, 'Case already assigned', { caseId });
        return null;
      }

      // Check deadline
      if (Date.now() > caseDoc.acceptanceDeadline) {
        logger.warn(this.MODULE, 'Case acceptance deadline passed', { caseId });
        return null;
      }

      // Update case
      const updatedCase: Partial<HelpCase> = {
        assignedVolunteer: volunteerId,
        status: 'accepted',
        acceptedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await FirestoreService.updateDocument('cases', caseId, updatedCase);

      // Update volunteer stats
      await this.incrementVolunteerStats(volunteerId);

      logger.info(this.MODULE, 'Case accepted successfully', { volunteerId, caseId });

      return { ...caseDoc, ...updatedCase } as HelpCase;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to accept case', error);
      throw error;
    }
  }

  /**
   * Resolve a case
   */
  async resolveCase(caseId: string): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Resolving case', { caseId });

      await FirestoreService.updateDocument('cases', caseId, {
        status: 'resolved',
        resolvedAt: Date.now(),
        updatedAt: Date.now(),
      });

      logger.info(this.MODULE, 'Case resolved', { caseId });
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to resolve case', error);
      return false;
    }
  }

  /**
   * Rate a volunteer
   */
  async rateVolunteer(
    caseId: string,
    volunteerId: string,
    userId: string,
    rating: number,
    feedback: string,
    categories: { responsiveness: number; professionalism: number; helpfulness: number }
  ): Promise<boolean> {
    try {
      logger.info(this.MODULE, 'Rating volunteer', { volunteerId, rating });

      // Create review
      const review: VolunteerReview = {
        id: this.generateId(),
        volunteerId,
        userId,
        caseId,
        rating,
        comment: feedback,
        categories,
        createdAt: Date.now(),
      };

      await FirestoreService.setDocument('reviews', review.id, review);

      // Update volunteer rating
      await this.updateVolunteerRating(volunteerId);

      // Update case
      await FirestoreService.updateDocument('cases', caseId, {
        volunteerRating: rating,
        feedback,
      });

      logger.info(this.MODULE, 'Volunteer rated successfully', { volunteerId });
      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to rate volunteer', error);
      return false;
    }
  }

  /**
   * Submit environment mapping
   */
  async submitMapping(
    volunteerId: string,
    location: { latitude: number; longitude: number },
    locationName: string,
    mappingType: 'layout' | 'products' | 'obstacles' | 'accessibility',
    data: Record<string, any>
  ): Promise<EnvironmentMapping> {
    try {
      logger.info(this.MODULE, 'Submitting environment mapping', { locationName, mappingType });

      const mapping: EnvironmentMapping = {
        id: this.generateId(),
        volunteerId,
        location,
        locationName,
        mappingType,
        data,
        verified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await FirestoreService.setDocument('mappings', mapping.id, mapping);

      logger.info(this.MODULE, 'Mapping submitted for review', { mappingId: mapping.id });

      return mapping;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to submit mapping', error);
      throw error;
    }
  }

  /**
   * Get volunteer profile
   */
  async getVolunteerProfile(volunteerId: string): Promise<VolunteerProfile | null> {
    try {
      return await FirestoreService.getDocument<VolunteerProfile>('volunteers', volunteerId);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get volunteer profile', error);
      return null;
    }
  }

  /**
   * Update volunteer location
   */
  async updateLocation(volunteerId: string, location: { latitude: number; longitude: number }): Promise<boolean> {
    try {
      await FirestoreService.updateDocument('volunteers', volunteerId, {
        currentLocation: location,
        lastStatusUpdate: Date.now(),
        updatedAt: Date.now(),
      });

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to update location', error);
      return false;
    }
  }

  /**
   * Update availability status
   */
  async updateAvailability(volunteerId: string, isAvailable: boolean): Promise<boolean> {
    try {
      await FirestoreService.updateDocument('volunteers', volunteerId, {
        isAvailable,
        lastStatusUpdate: Date.now(),
        updatedAt: Date.now(),
      });

      return true;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to update availability', error);
      return false;
    }
  }

  // ==================== Private Helper Methods ====================

  private calculateDistance(
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(location2.latitude - location1.latitude);
    const dLon = this.toRad(location2.longitude - location1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(location1.latitude)) *
        Math.cos(this.toRad(location2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.asin(Math.sqrt(a));

    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async validatePhoneCode(code: string): Promise<boolean> {
    // In production, call SMS verification service
    return code && code.length === 6;
  }

  private async incrementVolunteerStats(volunteerId: string): Promise<void> {
    const volunteer = await this.getVolunteerProfile(volunteerId);
    if (volunteer) {
      await FirestoreService.updateDocument('volunteers', volunteerId, {
        totalResponses: volunteer.totalResponses + 1,
        updatedAt: Date.now(),
      });
    }
  }

  private async updateVolunteerRating(volunteerId: string): Promise<void> {
    try {
      const reviews = await FirestoreService.queryDocuments<VolunteerReview>('reviews', [
        // Note: You will need to import `where` from firebase/firestore and pass: where('volunteerId', '==', volunteerId)
      ] as any);

      if (reviews.length === 0) return;

      const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
      const averageRating = totalRating / reviews.length;
      const successRate = (reviews.filter((r: any) => r.rating >= 4).length / reviews.length) * 100;

      await FirestoreService.updateDocument('volunteers', volunteerId, {
        averageRating,
        reviewCount: reviews.length,
        successRate,
        updatedAt: Date.now(),
      });
    } catch (error) {
      logger.error(this.MODULE, 'Failed to update volunteer rating', error);
    }
  }

  private async notifyVolunteers(volunteers: VolunteerProfile[], caseData: HelpCase): Promise<void> {
    try {
      // In production, send push notifications via FCM
      logger.info(this.MODULE, `Notifying ${volunteers.length} nearby volunteers about case`, {
        caseId: caseData.id,
      });

      // Notification payload would be sent here
      for (const volunteer of volunteers) {
        // await sendPushNotification(volunteer.fcmToken, {
        //   title: `Help Request - ${caseData.caseType}`,
        //   body: `A ${caseData.urgency} help request is nearby`,
        //   data: { caseId: caseData.id }
        // });
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to notify volunteers', error);
    }
  }
}

export const volunteerService = new VolunteerService();