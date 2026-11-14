import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';

/**
 * Seevia Deep Linking Configuration
 * Enables the "Trust Circle" in the UAE to interact with the Islamabad app 
 * via direct URLs.
 */
const prefix = Linking.createURL('/');

export const linking: LinkingOptions<any> = {
  prefixes: [prefix, 'seevia://'],
  
  config: {
    screens: {
      // Direct access to the Onboarding flow
      onboarding: 'setup',
      
      // Main App Tabs
      '(tabs)': {
        screens: {
          home: 'home',
          pantry: 'pantry',
          shopping: 'shop',
        },
      },
      
      // Specialized Module Routes
      'pantry/[id]': 'pantry/item/:id',
      'emergency/caregiver-connect': 'connect',
    },
  },
};
