import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// Services & UI Components
import { colors } from '@/src/constants/colors';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';

const AddItemScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    quantity: '1',
    category: 'General',
    unit: 'pcs'
  });

  const handleSave = async () => {
    if (!form.name) {
      TextToSpeechService.speak("Please enter an item name.");
      return;
    }

    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) throw new Error("No user found");

      await PantryService.addItem(user.uid, {
        name: form.name,
        quantity: parseInt(form.quantity),
        category: form.category,
        unit: form.unit,
      });

      await hapticService.trigger('success');
      await TextToSpeechService.speak(`${form.name} added to pantry.`);
      router.back();
    } catch (error) {
      Alert.alert("Error", "Could not add item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Manual Item</Text>
      <Text style={styles.subtitle}>Use this if the AI scanner cannot read the label.</Text>

      <View style={styles.form}>
        <Input
          label="Item Name"
          placeholder="e.g. Fresh Milk"
          value={form.name}
          onChangeText={(val) => setForm({ ...form, name: val })}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Input
              label="Qty"
              keyboardType="numeric"
              value={form.quantity}
              onChangeText={(val) => setForm({ ...form, quantity: val })}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Input
              label="Unit"
              placeholder="e.g. kg, liters"
              value={form.unit}
              onChangeText={(val) => setForm({ ...form, unit: val })}
            />
          </View>
        </View>

        <Input
          label="Category"
          placeholder="e.g. Dairy, Spices"
          value={form.category}
          onChangeText={(val) => setForm({ ...form, category: val })}
        />
      </View>

      <Button 
        title={loading ? "Saving..." : "Add to Pantry"} 
        onPress={handleSave}
        disabled={loading}
        style={styles.btn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 30 },
  form: { gap: 15, marginBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  btn: { marginTop: 20 }
});

export default AddItemScreen;
