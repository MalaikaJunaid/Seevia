/**
 * Seevia Emergency Event Model
 * The data structure used for SOS alerts and Fall Detection.
 */
export enum EmergencyType {
  FALL_DETECTION = 'fall_detection',
  MANUAL_SOS = 'manual_sos',
  VOICE_COMMAND = 'voice_command',
}

export enum EmergencyStatus {
  ACTIVE = 'active',      // SOS is currently ringing
  RESOLVED = 'resolved',  // Help arrived / User is safe
  CANCELLED = 'cancelled',// False alarm cancelled by user
}

export interface EmergencyEvent {
  id: string;
  userId: string;
  type: EmergencyType;
  status: EmergencyStatus;
  
  // Critical Data for First Responders
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  
  // Contacted Circle
  notifiedContacts: string[]; // IDs of EmergencyContacts from UserProfile
  
  // Fall Data (For 60% Defense technical proof)
  gForceImpact?: number; 
}
