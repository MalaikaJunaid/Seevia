import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Components & Theme
import { Button } from '../src/components/common/Button';
import { Input } from '../src/components/common/Input';
import { ScreenLayout } from '../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../src/theme/colors';
import TtsService from '../src/services/voice/TtsService';
import WakePhraseListener from '../src/services/voice/WakePhraseListener';
import { SPACING, TYPOGRAPHY } from '../src/theme';

export default function AddItemScreen() {
  const router = useRouter();
  
  // Local state for the form
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      TtsService.speak('Please enter an item name.');
      return;
    }

    try {
      setLoading(true);
      // Link to your Pantry Service logic here
      // await PantryService.addItem({ name: name.trim(), quantity: parseInt(quantity) || 1 });
      
      TtsService.speak(`${name} added to your pantry.`);
      router.back();
    } catch (error) {
      TtsService.speak('Failed to add item to the database.');
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    TtsService.speak("Listening for item name and quantity.");
    WakePhraseListener.startListening((transcript) => {
      setName(transcript);
      TtsService.speak(`I heard ${transcript}. Is this correct?`);
    });
  };

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Add Item</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Add items via voice, barcode, or manual entry.
      </Text>

      {/* Interactive AI Method Selectors */}
      <View style={styles.methodsContainer}>
        <TouchableOpacity style={styles.methodBox} onPress={startVoiceInput}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="mic" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.methodText, { color: theme.text }]}>Voice</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
        </View>

        <TouchableOpacity style={styles.methodBox} onPress={() => router.push('/scanner')}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="barcode-outline" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.methodText, { color: theme.text }]}>Barcode</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Input Form */}
      <View style={styles.form}>
        <Input
          label="Item Name"
          placeholder="e.g., Tapal Tea"
          value={name}
          onChangeText={setName}
          icon="cube-outline"
        />

        <Input
          label="Quantity"
          placeholder="1"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          icon="layers-outline"
        />

        <View style={styles.actionContainer}>
          <Button
            title="Confirm & Save"
            onPress={handleSave}
            disabled={!name.trim()}
            loading={loading}
            fullWidth
            style={{ marginBottom: SPACING.md }}
          />

          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  closeButton: {
    marginRight: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.lg,
  },
  methodsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: 24,
    paddingVertical: SPACING.xl,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    marginBottom: SPACING.xl,
  },
  methodBox: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  methodText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  divider: {
    marginHorizontal: SPACING.md,
  },
  dividerText: {
    ...TYPOGRAPHY.body,
    fontWeight: 'bold',
  },
  form: {
    marginTop: SPACING.md,
  },
  actionContainer: {
    marginTop: SPACING.xl,
  },
});
