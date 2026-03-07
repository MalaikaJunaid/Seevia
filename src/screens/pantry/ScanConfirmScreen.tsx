import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { Button } from '@/src/components/common/Button';

const ScanConfirmScreen = () => {
  const router = useRouter();
  const { productData, imageUri } = useLocalSearchParams();
  const [isSaving, setIsSaving] = useState(false);

  // Parse the product data passed from the Scanner
  const product = JSON.parse(productData as string);
  const user = AuthService.getCurrentUser();

  const handleConfirm = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await PantryService.addItem(user.uid, {
        name: product.name,
        quantity: product.quantity || 1,
        unit: product.unit || 'pcs',
        category: product.category || 'General',
        expiryDate: product.expiryDate,
        barcode: product.barcode
      });

      await hapticService.trigger('success');
      await TextToSpeechService.speak(`${product.name} saved to your pantry.`);
      router.replace('/(tabs)/pantry');
    } catch (error) {
      Alert.alert("Error", "Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = () => {
    hapticService.trigger('warning');
    TextToSpeechService.speak("Scan discarded. Retrying.");
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>AI IDENTIFIED</Text>
        <Image source={{ uri: imageUri as string }} style={styles.previewImage} />
        
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDetail}>Category: {product.category}</Text>
          {product.expiryDate && (
            <View style={styles.expiryRow}>
              <Ionicons name="calendar" size={16} color={colors.error} />
              <Text style={styles.expiryText}>Expires: {product.expiryDate}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button 
          title={isSaving ? "Saving..." : "Confirm & Save"} 
          onPress={handleConfirm}
          disabled={isSaving}
          style={styles.confirmBtn}
        />
        <Button 
          title="Try Again" 
          onPress={handleReject}
          variant="outline"
          style={styles.rejectBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, elevation: 4, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.primary, letterSpacing: 2, marginBottom: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20 },
  infoContainer: { alignItems: 'center', width: '100%' },
  productName: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  productDetail: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5 },
  expiryText: { color: colors.error, fontWeight: 'bold' },
  footer: { marginTop: 30, gap: 12 },
  confirmBtn: { width: '100%' },
  rejectBtn: { width: '100%', borderColor: colors.border }
});

export default ScanConfirmScreen;
