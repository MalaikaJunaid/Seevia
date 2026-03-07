import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { ExpiryService } from '@/src/services/pantry/expiry.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { Button } from '@/src/components/common/Button';

const PantryItemDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    loadItemDetails();
  }, [id]);

  const loadItemDetails = async () => {
    if (!user || !id) return;
    const data = await FirestoreService.getDocument<any>(
      `users/${user.uid}/pantryItems`, 
      id as string
    );
    setItem(data);
    
    if (data) {
      const status = ExpiryService.checkExpiryStatus(data);
      TextToSpeechService.speak(
        `${data.name}. ${data.quantity} ${data.unit} remaining. ${status.message}`
      );
    }
  };

  const handleConsume = async () => {
    if (!user || !item) return;
    try {
      await PantryService.updateItemQuantity(user.uid, item.id, 0); // Mark as consumed
      await hapticService.trigger('success');
      await TextToSpeechService.speak(`${item.name} removed from pantry.`);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not update item.");
    }
  };

  if (!item) return <View style={styles.container} />;

  const expiryStatus = ExpiryService.checkExpiryStatus(item);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.itemName}>{item.name}</Text>
      </View>

      <View style={styles.statusSection}>
        <View style={[styles.statusCard, { borderLeftColor: expiryStatus.isExpired ? colors.error : colors.success }]}>
          <Ionicons 
            name={expiryStatus.isExpired ? "alert-circle" : "calendar"} 
            size={24} 
            color={expiryStatus.isExpired ? colors.error : colors.primary} 
          />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Expiry Status</Text>
            <Text style={styles.statusValue}>{expiryStatus.message}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Ionicons name="cube" size={24} color={colors.primary} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Current Stock</Text>
            <Text style={styles.statusValue}>{item.quantity} {item.unit}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Product Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Added On</Text>
          <Text style={styles.detailValue}>{new Date(item.updatedAt?.seconds * 1000).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Barcode</Text>
          <Text style={styles.detailValue}>{item.barcode || "Manual Entry"}</Text>
        </View>
      </View>

      <View style={styles.actionFooter}>
        <Button 
          title="Mark as Consumed" 
          onPress={handleConsume} 
          variant="danger"
          style={styles.actionBtn}
        />
        <Button 
          title="Edit Details" 
          onPress={() => hapticService.selection()} 
          variant="outline"
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 30 },
  category: { fontSize: 14, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  itemName: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginTop: 5 },
  statusSection: { gap: 15, marginBottom: 30 },
  statusCard: { 
    flexDirection: 'row', 
    backgroundColor: colors.surface, 
    padding: 20, 
    borderRadius: 16, 
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    elevation: 2
  },
  statusTextContainer: { marginLeft: 15 },
  statusTitle: { fontSize: 12, color: colors.textSecondary },
  statusValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  detailsSection: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { color: colors.textSecondary },
  detailValue: { color: colors.text, fontWeight: '500' },
  actionFooter: { gap: 10, paddingBottom: 40 },
  actionBtn: { width: '100%' }
});

export default PantryItemDetailScreen;
