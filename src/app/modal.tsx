import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

// Seevia Core Components & Theme
import { Button } from '../src/components/common/Button';
import { ScreenLayout } from '../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../src/theme/colors';
import TtsService from '../src/services/voice/TtsService';
import HapticFeedback from '../src/services/shopping/HapticFeedback';
import { SPACING, TYPOGRAPHY } from '../src/theme';

export default function ModalScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams(); // 'emergency' or 'guide'

  useEffect(() => {
    // Auditory feedback based on modal context
    if (type === 'emergency') {
      TtsService.speak("Emergency SOS initiated. Alerting contacts in 10 seconds. Tap cancel to stop.");
      HapticFeedback.error(); // Repeated pulses for urgency
    } else {
      TtsService.speak("Seevia Voice Guide opened. Ask me anything.");
    }
  }, [type]);

  const handleDismiss = () => {
    TtsService.speak("Closing overlay.");
    router.back();
  };

  return (
    <ScreenLayout scrollable={false} padding={false} style={{ backgroundColor: theme.background }}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={32} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Dynamic Content based on Type */}
        <View style={styles.content}>
          {type === 'emergency' ? (
            <View style={styles.centerBox}>
              <View style={[styles.alertCircle, { backgroundColor: theme.danger }]}>
                <Ionicons name="warning" size={60} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: theme.danger }]}>EMERGENCY SOS</Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                A fall was detected. We are notifying your emergency contacts and local services.
              </Text>
              <Button 
                title="CANCEL SOS" 
                onPress={handleDismiss} 
                variant="outline" 
                style={{ borderColor: theme.danger, marginTop: SPACING.xl }}
                textStyle={{ color: theme.danger }}
              />
            </View>
          ) : (
            <View style={styles.centerBox}>
              <View style={[styles.guideCircle, { backgroundColor: theme.primary }]}>
                <Ionicons name="mic" size={60} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Seevia Assistant</Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                "What's in my pantry?"{"\n"}"Take me to the Milk aisle."{"\n"}"Scan this product."
              </Text>
              <Button 
                title="GOT IT" 
                onPress={handleDismiss} 
                style={{ marginTop: SPACING.xl, width: '100%' }} 
              />
            </View>
          )}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.md,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    width: '100%',
  },
  alertCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  guideCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: SPACING.lg,
  }
});
