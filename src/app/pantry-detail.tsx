import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Core Components & Theme
import ScreenLayout from '@/components/common/ScreenLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';

// Services
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { expiryService } from '@/services/pantry/expiry.service';
import HealthGuard from '@/services/pantry/HealthGuard';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { hapticService } from '@/services/common/haptic.service';
import { PantryItem, PantryCategory } from '@/models/PantryItem';
import { logger } from '@/utils/logger';

const CATEGORY_IMAGES: Record<string, any> = {
  [PantryCategory.DAIRY]: require('../assets/images/categories/dairy.png'),
  [PantryCategory.BAKERY]: require('../assets/images/categories/bakery.png'),
  [PantryCategory.FROZEN]: require('../assets/images/categories/frozen.png'),
  'default': { uri: 'https://cdn-icons-png.flaticon.com/512/135/135763.png' },
};

export default function PantryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { speak } = useVoiceCommands();
  const user = AuthService.getCurrentUser();

  const [item, setItem] = useState<PantryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [safetyStatus, setSafetyStatus] = useState<{ isSafe: boolean; message: string; reason?: string } | null>(null);

  useEffect(() => {
    loadItemDetails();
  }, [id]);

  const loadItemDetails = async () => {
    if (!user || !id) return;
    
    try {
      setLoading(true);
      const fetchedItem = await PantryService.getPantryItem(user.uid, id as string);
      
      if (fetchedItem) {
        setItem(fetchedItem);

        // 🛠️ FIXED: Type casting for allergy_tags if they exist on the object
        const safety = await HealthGuard.validateSafety(user.uid, {
          product_name: fetchedItem.name,
          allergy_tags: (fetchedItem as any).allergy_tags || [],
        });
        setSafetyStatus(safety);

        const expiry = expiryService.checkExpiryStatus(fetchedItem);
        let announcement = `${fetchedItem.name} ki details load ho gayi hain. Aap ke paas ${fetchedItem.quantity} baqi hain. `;
        
        if (expiry.isExpired) {
          announcement += "Yeh item expire ho chuka hai. Isay zaya kar dein. ";
        } else if (expiry.isExpiringSoon) {
          announcement += "Yeh jald expire hone wala hai. ";
        }

        if (!safety.isSafe) {
          announcement += `Khabardar: ${safety.message}`;
        }

        speak(announcement);
      } else {
        speak("Item nahi mila.");
      }
    } catch (error) {
      logger.error("PANTRY_DETAIL", "Error loading details", error);
      speak("Details load karne mein masla aaya.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (delta: number) => {
    if (!item || !user) return;
    
    const newQuantity = Math.max(0, item.quantity + delta);
    setItem({ ...item, quantity: newQuantity });
    await hapticService.trigger('light');

    try {
      await PantryService.updatePantryItem(user.uid, item.id, { quantity: newQuantity });
      if (newQuantity === 0) {
        speak(`${item.name} khatam ho gaya hai.`);
      }
    } catch (error) {
      setItem({ ...item, quantity: item.quantity });
      speak("Quantity update nahi ho saki.");
    }
  };

  const handleDelete = () => {
    if (!item || !user) return;

    speak(`Kya aap waqai ${item.name} delete karna chahtay hain?`);
    hapticService.trigger('heavy');
    
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove ${item.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await PantryService.deletePantryItem(user.uid, item.id);
              speak(`${item.name} delete kar diya gaya hai.`);
              router.back();
            } catch (error) {
              speak("Item delete karne mein masla aaya.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !item) {
    return (
      <ScreenLayout scrollable={false}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </ScreenLayout>
    );
  }

  const expiryInfo = expiryService.checkExpiryStatus(item);
  const imageSource = item.imageUrl ? { uri: item.imageUrl } : (CATEGORY_IMAGES[item.category || 'default'] || CATEGORY_IMAGES['default']);

  return (
    <ScreenLayout scrollable={true}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.heroContainer}>
        <Image source={imageSource} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.category}>{item.category || 'Grocery'}</Text>
      </View>

      <Card style={styles.controlCard}>
        <Text style={styles.cardLabel}>Quantity in Stock</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity style={styles.qtyButton} onPress={() => handleUpdateQuantity(-1)}>
            <Ionicons name="remove" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <TouchableOpacity style={styles.qtyButton} onPress={() => handleUpdateQuantity(1)}>
            <Ionicons name="add" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* 🛠️ FIXED: Using StyleSheet.flatten to resolve array-to-ViewStyle mismatch */}
      <Card style={StyleSheet.flatten([styles.infoCard, { borderLeftColor: expiryInfo.color, borderLeftWidth: 4 }])}>
        <View style={styles.infoRow}>
          <Ionicons name={expiryInfo.isExpired ? "alert-circle" : "calendar-outline"} size={24} color={expiryInfo.color} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Expiry Status</Text>
            <Text style={[styles.infoSubtext, { color: expiryInfo.color, fontWeight: '600' }]}>
              {expiryInfo.message}
            </Text>
          </View>
        </View>
      </Card>

      {safetyStatus && !safetyStatus.isSafe && (
        <Card style={StyleSheet.flatten([styles.infoCard, { backgroundColor: 'rgba(255, 69, 58, 0.1)', borderColor: theme.danger, borderWidth: 1 }])}>
          <View style={styles.infoRow}>
            <Ionicons name="warning" size={24} color={theme.danger} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: theme.danger }]}>Health Guard Alert</Text>
              <Text style={styles.infoSubtext}>{safetyStatus.message}</Text>
            </View>
          </View>
        </Card>
      )}

      {safetyStatus && safetyStatus.isSafe && (
        <Card style={StyleSheet.flatten([styles.infoCard, { backgroundColor: 'rgba(48, 209, 88, 0.05)' }])}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Safe for You</Text>
              <Text style={styles.infoSubtext}>This item aligns with your dietary profile.</Text>
            </View>
          </View>
        </Card>
      )}

      <View style={styles.actionContainer}>
        <Button 
          title="Delete Item" 
          variant="outline" 
          onPress={handleDelete}
          style={styles.deleteBtn}
          textStyle={{ color: theme.danger }}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl, paddingTop: SPACING.sm },
  headerTitle: { ...TYPOGRAPHY.subheading, color: theme.text, fontSize: 20, fontWeight: '700' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { color: theme.primary, marginTop: SPACING.md, fontWeight: '600' },
  heroContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  heroImage: { width: 120, height: 120, borderRadius: RADIUS.lg, backgroundColor: theme.backgroundSecondary, marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.display, fontSize: 28, color: theme.text, textAlign: 'center' },
  category: { ...TYPOGRAPHY.body, color: theme.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  controlCard: { padding: SPACING.lg, marginBottom: SPACING.md, alignItems: 'center' },
  cardLabel: { color: theme.textSecondary, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.md, fontWeight: '600' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '60%' },
  qtyButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: 32, fontWeight: 'bold', color: theme.primary },
  infoCard: { padding: SPACING.md, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoTextContainer: { flex: 1, marginLeft: SPACING.md },
  infoTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
  infoSubtext: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
  // 🛠️ FIXED: Changed xxl to 2xl to match your SPACING theme tokens
  actionContainer: { marginTop: SPACING.xl, marginBottom: SPACING['2xl'] }, 
  deleteBtn: { borderColor: theme.danger }
});