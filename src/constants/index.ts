/**
 * Seevia Constants Hub
 * Centralizes all application configurations, voice commands, and pantry categories.
 */

export * from './categories';
export * from './commands';
export * from './config';

// If you added these specialized files as suggested for your defense:
// export * from './emergency';
// export * from './store';

/**
 * Global App Metadata
 */
export const APP_METADATA = {
  NAME: 'Seevia',
  DEVELOPER: 'Malaika Junaid',
  VERSION: '1.0.0-beta',
  INSTITUTION: 'COMSATS University Islamabad',
};
