import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/colors';
import { Button } from '@/src/components/common/Button';
import { hapticService } from '@/src/services/common/haptic.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';

const SOSActiveScreen = () => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    // Start SOS Multimodal feedback
    hapticService.sosHeartbeat();
    TextToSpeechService.speak("Emergency detected. Sending your location to your family in 10 seconds. Say Cancel to stop.");

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerEmergency();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerEmergency = async () => {
    // Logic: Send GPS and notify UAE via Firebase
    await TextToSpeechService.speak("Alert sent. Your family is being notified.");
    router.replace('/emergency/caregiver-connect');
  };

  const handleCancel = () => {
    hapticService.trigger('success');
    TextToSpeechService.speak("Emergency cancelled.");
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EMERGENCY ALERT</Text>
      <View style={styles.circle}>
        <Text style={styles.timer}>{countdown}</Text>
      </View>
      <Text style={styles.hint}>Sending location to UAE...</Text>
      
      <Button 
        title="CANCEL (I AM OK)" 
        onPress={handleCancel} 
        variant="outline" 
        style={styles.cancelBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: 'white', fontSize: 32, fontWeight: '900', marginBottom: 40 },
  circle: { width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 10, borderColor: 'white' },
  timer: { color: 'white', fontSize: 80, fontWeight: 'bold' },
  hint: { color: 'white', fontSize: 18, marginTop: 30, textAlign: 'center' },
  cancelBtn: { width: '100%', marginTop: 50, borderColor: 'white' }
});

export default SOSActiveScreen;
