import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME as theme } from '../../src/theme/colors';
import SensorService from '../../src/modules/emergency/SensorService';
import { useVoiceCommands } from '../../src/hooks/useVoiceCommands';

export default function EmergencyScreen() {
  const { speak } = useVoiceCommands();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Start the AI Fall Detection Sensor logic
    SensorService.start(() => {
      // Logic triggered by SensorService detection
      speak("Fall detected. Calling emergency contacts in 10 seconds.");
      // In a real scenario, this would navigate to a countdown modal
    });

    // Pulse animation to show monitoring is active
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    return () => SensorService.stop();
  }, []);

  const triggerManualSOS = () => {
    speak("Manual SOS triggered. Alerting emergency contacts.");
    // Add logic for immediate SMS/Call dispatch
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Safety Hub</Text>
      
      {/* Monitoring Status Indicator */}
      <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Animated.View 
          style={[styles.pulseCircle, { backgroundColor: theme.success, transform: [{ scale: pulseAnim }] }]} 
        />
        <View>
          <Text style={[styles.statusTitle, { color: theme.text }]}>AI Fall Detection</Text>
          <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
            Monitoring via Sensors Active
          </Text>
        </View>
      </View>

      {/* Large Manual SOS Button */}
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={triggerManualSOS}
        style={[styles.sosButton, { backgroundColor: theme.danger, shadowColor: theme.danger }]}
      >
        <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
        <Text style={styles.sosText}>TRIGGER SOS</Text>
      </TouchableOpacity>

      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        Hold button for 2 seconds to manually alert contacts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  statusCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  pulseCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 14,
  },
  sosButton: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
  },
  hint: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 14,
  }
});
