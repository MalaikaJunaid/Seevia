import React from 'react';
import { StyleSheet, TouchableOpacity, Vibration, Image, View } from 'react-native';
import { DARK_THEME as theme } from '@/theme/colors';
import TtsService from '@/services/voice/TtsService';
import { useAccessibility } from '@/hooks/useAccessibility';

interface BrailleDotsProps {
  size?: number; // Allows scaling the logo if needed in different headers
}

function BrailleDots({ size = 40 }: BrailleDotsProps) {
  const { triggerHapticFeedback } = useAccessibility();

  const handlePress = () => {
    // Tactile confirmation (Module 1 sensory branding)
    if (triggerHapticFeedback) {
      triggerHapticFeedback('medium');
    }
    Vibration.vibrate(50);
    
    // Auditory branding
    TtsService.speak("Seevia");
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={handlePress}
      accessibilityLabel="Seevia Braille Logo"
      accessibilityRole="image"
      accessibilityHint="Tactile logo. Tap to hear app name."
      style={styles.container}
    >
      <Image 
        source={require('../../assets/images/seevia-braile.png')} 
        style={[
          styles.logo, 
          { width: size * 2.5, height: size } // Maintains the rectangular braille aspect ratio
        ]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    // High contrast tinting if necessary, though usually handled in the asset
    tintColor: theme.primary, 
  },
});

// CRITICAL: Default export to prevent Dashboard "undefined" crashes
export default BrailleDots;