import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// Seevia Core Integrations
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { PantryCategory } from '@/models/PantryItem';
import { logger } from '@/utils/logger';
import { PANTRY_CATEGORIES, UNIT_OPTIONS } from '@/constants/categories';

// UI Components (Using Default Imports as established)
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

// Services
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { hapticService } from '@/services/common/haptic.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';

const AddItemScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // 🛠️ UPGRADED: Form state now supports localized names and strict enums
  const [form, setForm] = useState({
    name: '',
    nameUr: '', // 🇵🇰 Roman Urdu name for Voice assistant
    quantity: '1',
    category: PantryCategory.OTHER,
    unit: 'pieces',
    lowStockThreshold: '1',
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      await hapticService.trigger('error');
      TextToSpeechService.speak("Please enter an item name.");
      return;
    }

    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("Authentication required");

      // 🛠️ UPGRADED: Using the refined addPantryItem method
      await PantryService.addPantryItem(user.uid, {
        name: form.name.trim(),
        nameUr: form.nameUr.trim() || undefined,
        quantity: parseInt(form.quantity) || 1,
        category: form.category,
        unit: form.unit,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 1,
        addedDate: new Date().toISOString(), // 🛠️ Model Compliance Fix
        expiryDate: null, // Default for manual add, can be updated in details
      });

      await hapticService.trigger('success');
      // 🗣️ TTS Announcement
      const announcement = form.nameUr ? `${form.nameUr} added.` : `${form.name} added to pantry.`;
      await TextToSpeechService.speak(announcement);
      
      router.back();
    } catch (error: any) {
      logger.error('ADD_ITEM_SCREEN', 'Failed to save item', error);
      Alert.alert("Save Failed", "Could not synchronize with cloud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Add Manual Item</Text>
      <Text style={styles.subtitle}>
        Fill in the details for items not recognized by the AI scanner.
      </Text>

      <View style={styles.form}>
        {/* Item Names (English & Urdu) */}
        <Input
          label="Item Name (English)"
          placeholder="e.g. Fresh Milk"
          value={form.name}
          onChangeText={(val) => setForm({ ...form, name: val })}
          accessibilityLabel="Enter item name in English"
        />

        <Input
          label="Item Name (Roman Urdu)"
          placeholder="e.g. Taza Doodh"
          value={form.nameUr}
          onChangeText={(val) => setForm({ ...form, nameUr: val })}
          accessibilityLabel="Enter item name in Roman Urdu for voice assistant"
        />

        {/* Qty & Unit Row */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: SPACING.md }}>
            <Input
              label="Quantity"
              keyboardType="numeric"
              value={form.quantity}
              onChangeText={(val) => setForm({ ...form, quantity: val })}
              accessibilityLabel="Enter quantity"
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <Input
              label="Unit"
              placeholder="e.g. kg, liters"
              value={form.unit}
              onChangeText={(val) => setForm({ ...form, unit: val })}
              accessibilityLabel="Enter unit of measurement"
            />
          </View>
        </View>

        {/* Category Picker Placeholder (Can be upgraded to a Modal Picker later) */}
        <Input
          label="Category"
          placeholder="e.g. Dairy, Spices"
          value={form.category}
          onChangeText={(val) => setForm({ ...form, category: val as PantryCategory })}
          accessibilityLabel="Select Category"
        />

        <Input
          label="Low Stock Warning at:"
          keyboardType="numeric"
          value={form.lowStockThreshold}
          onChangeText={(val) => setForm({ ...form, lowStockThreshold: val })}
          accessibilityLabel="Set low stock alert threshold"
        />
      </View>

      <Button 
        title={loading ? "Synchronizing..." : "Add to Inventory"} 
        onPress={handleSave}
        disabled={loading}
        variant="primary" // 🛠️ Explicitly using theme primary
        style={styles.btn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background 
  },
  content: { 
    padding: SPACING.lg, 
    paddingTop: SPACING.xl 
  },
  title: { 
    ...TYPOGRAPHY.display, 
    color: theme.text,
    marginBottom: SPACING.xs 
  },
  subtitle: { 
    ...TYPOGRAPHY.body, 
    color: theme.textSecondary, 
    marginBottom: SPACING.xl 
  },
  form: { 
    gap: SPACING.md, 
    marginBottom: SPACING.xl 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'flex-end' 
  },
  btn: { 
    marginTop: SPACING.lg,
    height: 56, // Optimized for touch target accessibility
    borderRadius: RADIUS.md
  }
});

export default AddItemScreen;