import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Integrations
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { expiryService } from '@/services/pantry/expiry.service'; // 🛠️ FIXED: Used exported instance
import { AuthService } from '@/services/firebase/auth.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { hapticService } from '@/services/common/haptic.service';
import { logger } from '@/utils/logger'; // 🛠️ Added for error tracking

// UI Components
import Button from '@/components/common/Button';

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
    try {
      // 🛠️ FIXED: Path updated to match your Seevia structure
      const data = await FirestoreService.getDocument<any>(
        `users/${user.uid}/pantry`, 
        id as string
      );
      setItem(data);
      
      if (data) {
        const status = expiryService.checkExpiryStatus(data);
        TextToSpeechService.speak(
          `${data.name}. ${data.quantity} ${data.unit} remaining. ${status.message}`
        );
      }
    } catch (err) {
      logger.error('DETAIL_SCREEN', 'Failed to load item', err);
    }
  };

  const handleConsume = async () => {
    if (!user || !item) return;
    try {
      // 🛠️ FIXED: Using updatePantryItem to match your service implementation
      await PantryService.updatePantryItem(user.uid, item.id, { quantity: 0 }); 
      await hapticService.trigger('success');
      await TextToSpeechService.speak(`${item.name} removed from pantry.`);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not update item.");
    }
  };

  if (!item) return <View style={styles.container} />;

  const expiryStatus = expiryService.checkExpiryStatus(item);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.itemName}>{item.name}</Text>
      </View>

      <View style={styles.statusSection}>
        {/* 🛠️ FIXED: theme.error changed to theme.danger to match colors.ts */}
        <View style={[styles.statusCard, { borderLeftColor: expiryStatus.isExpired ? theme.danger : theme.success }]}>
          <Ionicons 
            name={expiryStatus.isExpired ? "alert-circle" : "calendar"} 
            size={24} 
            color={expiryStatus.isExpired ? theme.danger : theme.primary} 
          />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Expiry Status</Text>
            <Text style={styles.statusValue}>{expiryStatus.message}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Ionicons name="cube" size={24} color={theme.primary} />
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
          <Text style={styles.detailValue}>
            {item.addedDate ? new Date(item.addedDate).toLocaleDateString() : "N/A"}
          </Text>
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
          onPress={() => hapticService.trigger('selection')} 
          variant="outline"
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: SPACING.lg, paddingTop: 60 },
  header: { marginBottom: SPACING.xl },
  category: { ...TYPOGRAPHY.caption, color: theme.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  itemName: { ...TYPOGRAPHY.display, color: theme.text, marginTop: 5 },
  statusSection: { gap: 15, marginBottom: 30 },
  statusCard: { 
    flexDirection: 'row', 
    backgroundColor: theme.backgroundSecondary, // 🛠️ Match theme surfaced
    padding: 20, 
    borderRadius: RADIUS.md, 
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: theme.primary,
    elevation: 2
  },
  statusTextContainer: { marginLeft: 15 },
  statusTitle: { ...TYPOGRAPHY.caption, color: theme.textSecondary },
  statusValue: { ...TYPOGRAPHY.body, fontWeight: 'bold', color: theme.text },
  detailsSection: { backgroundColor: theme.backgroundSecondary, padding: 20, borderRadius: RADIUS.md, marginBottom: 30 },
  sectionTitle: { ...TYPOGRAPHY.subheading, color: theme.text, marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { color: theme.textSecondary },
  detailValue: { color: theme.text, fontWeight: '500' },
  actionFooter: { gap: 10, paddingBottom: 40 },
  actionBtn: { width: '100%' }
});

export default PantryItemDetailScreen;