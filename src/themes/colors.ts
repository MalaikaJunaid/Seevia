/**
 * Seevia Atomic Color Palette
 * The single source of truth for all colors in the Seevia ecosystem.
 * Optimized for High-Contrast Accessibility (PWD).
 */

export const LIGHT_THEME = {
  // Brand Colors
  primary: '#FF7A00',        // Seevia Signature Orange
  primaryLight: '#FB923C',   
  primaryDark: '#C2410C',    
  
  // Background & Surfaces
  background: '#FFFFFF',     
  backgroundSecondary: '#F9FAFB', 
  surface: '#F3F4F6',        // Used for cards and sections
  
  // Text Colors
  text: '#111827',           // Near Black for max contrast
  textSecondary: '#4B5563', 
  textTertiary: '#9CA3AF',  
  
  // Status Colors (WCAG Compliant)
  success: '#16A34A',       
  danger: '#DC2626',        
  warning: '#F59E0B',       
  info: '#2563EB',          
  
  // UI Elements
  border: '#D1D5DB',        
  divider: '#E5E7EB',       
  icon: '#4B5563',
  
  // Interaction
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#FF7A00',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const DARK_THEME = {
  // Brand Colors (Consistent Orange)
  primary: '#FF7A00',        
  primaryLight: '#FB923C',   
  primaryDark: '#C2410C',    
  
  // Background & Surfaces
  background: '#111827',     // Deep Navy/Black
  backgroundSecondary: '#1F2937', 
  surface: '#2A2A2A',        // Elevated dark surface for cards
  
  // Text Colors
  text: '#F9FAFB',           // Near White
  textSecondary: '#D1D5DB', 
  textTertiary: '#6B7280',  
  
  // Status Colors (Vibrant for Dark Mode)
  success: '#22C55E',       
  danger: '#EF4444',        
  warning: '#FBBF24',       
  info: '#60A5FA',          
  
  // UI Elements
  border: '#374151',        
  divider: '#1F2937',       
  icon: '#D1D5DB',
  
  // Interaction
  tabIconDefault: '#6B7280',
  tabIconSelected: '#FF7A00',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export type ThemeColors = typeof LIGHT_THEME;
