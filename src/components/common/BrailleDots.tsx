import React from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { DARK_THEME as theme } from '@/src/theme/colors';
import TtsService from '@/src/services/voice/TtsService';
// Assuming useAccessibility hook provides haptic triggers
import { useAccessibility } from '@/src/hooks/useAccessibility';

interface BrailleDotsProps {
  // Representing 'Seevia' in Grade 1 Braille dots
  // Dots are 1-6 per character: S(2,3,4), E(1,5), E(1,5), V(1,2,3,6), I(2,4), A(1)
  pattern?: boolean[]; 
}

export function BrailleDots({ 
  pattern = [true, true, false, true, true, false, true, false] 
}: BrailleDotsProps) {
  const { triggerHapticFeedback } = useAccessibility();

  const handlePress = () => {
    // Tactile confirmation
    triggerHapticFeedback('medium');
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
      style={styles.container}
    >
      <View style={styles.dotGrid}>
        {pattern.map((active, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: active ? theme.primary : theme.cardBorder,
                // Scale active dots slightly for better visual hierarchy
                transform: [{ scale: active ? 1.1 : 1 }],
              },
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // Provide a subtle shadow for active dots to simulate depth
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});
