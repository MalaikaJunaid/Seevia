import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface NavigationPointerProps {
  targetHeading: number; // Angle in degrees (0-360)
  isActive: boolean;
}

/**
 * Haptic Compass for Seevia.
 * Guides PWD users toward a target aisle using real-time sensor data.
 */
export function NavigationPointer({ targetHeading, isActive }: NavigationPointerProps) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (isActive) {
      _subscribe();
    } else {
      _unsubscribe();
    }
    return () => _unsubscribe();
  }, [isActive]);

  const _subscribe = () => {
    Magnetometer.setUpdateInterval(100);
    setSubscription(
      Magnetometer.addListener(result => {
        setData(result);
        _checkAlignment(result);
      })
    );
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  // Calculate current heading from magnetometer data
  const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
  const currentHeading = angle >= 0 ? angle : 360 + angle;
  
  // Relative angle to target
  const relativeAngle = (targetHeading - currentHeading + 360) % 360;
  const isAligned = relativeAngle < 15 || relativeAngle > 345;

  const _checkAlignment = (sensorData: any) => {
    if (isAligned && isActive) {
      // Trigger haptic "Pulse" when facing the right way
      HapticFeedback.lightTap();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.pointerCircle, 
        { 
          borderColor: isAligned ? theme.primary : theme.cardBorder,
          backgroundColor: isAligned ? `${theme.primary}10` : 'transparent'
        }
      ]}>
        <Animated.View style={{ transform: [{ rotate: `${relativeAngle}deg` }] }}>
          <Ionicons 
            name="navigate-circle" 
            size={100} 
            color={isAligned ? theme.primary : theme.textTertiary} 
          />
        </Animated.View>
      </View>
      
      <Text style={[
        styles.hintText, 
        { color: isAligned ? theme.primary : theme.textSecondary }
      ]}>
        {isAligned ? "Target is Straight Ahead" : "Rotate phone to find Aisle"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  pointerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  hintText: {
    ...TYPOGRAPHY.body,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
