import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { AuthService } from '@/src/services/firebase/auth.service';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';

const CaregiverConnectScreen = () => {
  const [caregiver, setCaregiver] = useState<any>(null);
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    loadCaregiverInfo();
  }, []);

  const loadCaregiverInfo = async () => {
    if (!user) return;
    const profile = await FirestoreService.getDocument<any>('users', user.uid);
    if (profile?.emergencyContact) {
      setCaregiver({
        name: profile.caregiverName || "UAE Family",
        phone: profile.emergencyContact,
        location: "Dubai, UAE"
      });
    }
  };

  const handleCall = () => {
    if (!caregiver) return;
    hapticService.trigger('success');
    TextToSpeechService.speak(`Calling ${caregiver.name} now.`);
    Linking.openURL(`tel:${caregiver.phone}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trust Circle</Text>
        <Text style={styles.subtitle}>Connected to your family in the UAE</Text>
      </View>

      <View style={styles.caregiverCard}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={50} color={colors.primary} />
        </View>
        <Text style={styles.caregiverName}>{caregiver?.name || "Loading..."}</Text>
        <View style={styles.statusRow}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.statusText}>Active in {caregiver?.location}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
          <View style={[styles.iconCircle, { backgroundColor: '#4CD964' }]}>
            <Ionicons name="call" size={30} color="white" />
          </View>
          <Text style={styles.actionLabel}>Voice Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => hapticService.selection()}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubble" size={30} color="white" />
          </View>
          <Text style={styles.actionLabel}>Voice Note</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Your current location and pantry status are being shared with your caregiver for assistance.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 25 },
  header: { marginTop: 50, marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  caregiverCard: { 
    backgroundColor: colors.surface, 
    borderRadius: 24, 
    padding: 30, 
    alignItems: 'center',
    elevation: 4,
    marginBottom: 40
  },
  avatarPlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: colors.background, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 15
  },
  caregiverName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  onlineIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CD964', marginRight: 8 },
  statusText: { color: colors.textSecondary, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionBtn: { alignItems: 'center' },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontWeight: '600', color: colors.text },
  infoBox: { 
    flexDirection: 'row', 
    backgroundColor: colors.surface, 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 'auto', 
    marginBottom: 20,
    alignItems: 'center'
  },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12, color: colors.textSecondary, lineHeight: 18 }
});

export default CaregiverConnectScreen;
