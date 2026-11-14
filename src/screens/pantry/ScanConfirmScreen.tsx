import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Integrations
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { hapticService } from '@/services/common/haptic.service';
import { logger } from '@/utils/logger'; // 🛠️ Added for error tracking

// UI Components
import Button from '@/components/common/Button';

const ScanConfirmScreen = () => {
  const router = useRouter();
  const { productData, imageUri } = useLocalSearchParams();
  const [isSaving, setIsSaving] = useState(false);

  // Parse the product data passed from the AI Scanner
  const product = JSON.parse(productData as string);
  const user = AuthService.getCurrentUser();

  const handleConfirm = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // 🛠️ FIXED: Method name updated to addPantryItem
      await PantryService.addPantryItem(user.uid, {
        name: product.name,
        quantity: product.quantity || 1,
        unit: product.unit || 'pieces',
        category: product.category || 'Other',
        expiryDate: product.expiryDate || null,
        barcode: product.barcode,
        addedDate: new Date().toISOString(), // 🛠️ Model Compliance Fix
      });

      await hapticService.trigger('success');
      await TextToSpeechService.speak(`${product.name} saved to your pantry.`);
      router.replace('/(tabs)/pantry');
    } catch (error) {
      logger.error('SCAN_CONFIRM', 'Failed to save scanned item', error);
      Alert.alert("Error", "Failed to synchronize with cloud.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    await hapticService.trigger('warning');
    await TextToSpeechService.speak("Scan discarded.");
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
              {/* 🛠️ FIXED: theme.error changed to theme.danger to match colors.ts */}
              <Ionicons name="calendar" size={16} color={theme.danger} />
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
  container: { 
    flex: 1, 
    backgroundColor: theme.background, 
    padding: SPACING.lg, 
    justifyContent: 'center' 
  },
  card: { 
    backgroundColor: theme.backgroundSecondary, // 🛠️ Match formalized theme surfaces
    borderRadius: RADIUS.xl, 
    padding: 20, 
    elevation: 4, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border
  },
  label: { 
    ...TYPOGRAPHY.caption, 
    color: theme.primary, 
    letterSpacing: 2, 
    marginBottom: 15,
    fontWeight: 'bold' 
  },
  previewImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: RADIUS.md, 
    marginBottom: 20 
  },
  infoContainer: { alignItems: 'center', width: '100%' },
  productName: { 
    ...TYPOGRAPHY.subheading, 
    fontSize: 24, 
    color: theme.text, 
    textAlign: 'center' 
  },
  productDetail: { 
    ...TYPOGRAPHY.body, 
    color: theme.textSecondary, 
    marginTop: 5 
  },
  expiryRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10, 
    gap: 5 
  },
  expiryText: { 
    color: theme.danger, // 🛠️ FIXED: Used theme.danger
    fontWeight: 'bold' 
  },
  footer: { 
    marginTop: 30, 
    gap: 12 
  },
  confirmBtn: { width: '100%' },
  rejectBtn: { 
    width: '100%', 
    borderColor: theme.border 
  }
});

export default ScanConfirmScreen;