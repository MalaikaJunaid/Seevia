/**
 * Seevia User Profile Model
 * Defines the core identity, accessibility preferences, and safety data.
 */

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string; // 'Family', 'Friend', 'Caregiver', 'Doctor', etc.
  isPrimary: boolean;   // Added to designate the first person to call in SOS
}

export interface UserProfile {
  id: string;          // Maps to Firebase UID
  name: string;
  email?: string;
  phone?: string;
  
  // Onboarding & Interaction Preferences
  language: 'English' | 'Urdu' | 'Punjabi';
  voicePitch: 'Low' | 'Medium' | 'High';
  interactionMode: 'Full Voice' | 'Voice + Gesture' | 'Manual Touch';
  
  // Module 6: Emergency & Safety Circle
  emergencyContacts: EmergencyContact[];
  
  // Health & Medical Context (Crucial for PWD Assistive Tech)
  medications?: string[];
  allergies?: string[];
  bloodGroup?: string; 
  
  // Accessibility & Hardware Settings
  highContrastMode: boolean;
  hapticFeedback: boolean;
  voiceConfirmations: boolean;
  micSensitivity: 'Low' | 'Medium' | 'High';
  
  // Module 6: Fall Detection Logic
  fallDetectionEnabled: boolean;
  fallDetectionSensitivity: 'Low' | 'Medium' | 'High';
  
  // Metadata
  createdAt: string; // Using ISO strings for easy Firestore storage
  updatedAt: string;
}

/**
 * Input Interface for Registration and Profile Updates
 */
export interface UserProfileInput {
  name: string;
  email?: string;
  phone?: string;
  language?: 'English' | 'Urdu' | 'Punjabi';
  voicePitch?: 'Low' | 'Medium' | 'High';
  interactionMode?: 'Full Voice' | 'Voice + Gesture' | 'Manual Touch';
  emergencyContacts?: EmergencyContact[];
  medications?: string[];
  allergies?: string[];
}
