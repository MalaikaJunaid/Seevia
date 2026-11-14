import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Core Components
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import ScreenLayout from '@/components/common/ScreenLayout';

// Theme & Models
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { PantryCategory } from '@/models/PantryItem';

// Services
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

export default function AddItemScreen() {
  const router = useRouter();
  const user = AuthService.getCurrentUser();
  const { isListening, startListening, transcript } = useVoiceCommands();
  
  const { itemName, quantity: paramQty, category: paramCat } = useLocalSearchParams<{ 
    itemName?: string; 
    quantity?: string; 
    category?: string; 
  }>();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<PantryCategory>(PantryCategory.OTHER);
  const [loading, setLoading] = useState(false);

  // Robust Category Mapper
  const mapAiCategoryToEnum = (aiCategory: string | undefined): PantryCategory => {
    if (!aiCategory) return PantryCategory.OTHER;
    const normalizedTarget = aiCategory.toLowerCase().trim();
    const validCategories: string[] = Object.values(PantryCategory) as string[];
    
    for (const validCat of validCategories) {
      if (typeof validCat === 'string' && validCat.toLowerCase() === normalizedTarget) {
        return validCat as PantryCategory;
      }
    }

    if (normalizedTarget.includes('meat') || normalizedTarget.includes('fish') || normalizedTarget.includes('chicken')) return PantryCategory.MEAT; 
    if (normalizedTarget.includes('daal') || normalizedTarget.includes('pulse') || normalizedTarget.includes('lentil')) return PantryCategory.DAAL_PULSES;
    if (normalizedTarget.includes('oil') || normalizedTarget.includes('ghee') || normalizedTarget.includes('butter')) return PantryCategory.OILS_FATS;
    if (normalizedTarget.includes('grain') || normalizedTarget.includes('wheat') || normalizedTarget.includes('rice')) return PantryCategory.GRAINS;
    if (normalizedTarget.includes('med') || normalizedTarget.includes('pill')) return PantryCategory.MEDICINE;
    if (normalizedTarget.includes('soap') || normalizedTarget.includes('clean')) return PantryCategory.HOUSEHOLD;
    
    return PantryCategory.OTHER; 
  };

  // Populate from Orchestrator Routing
  useEffect(() => {
    if (itemName) setName(itemName);
    if (paramQty) setQuantity(paramQty);
    if (paramCat) setCategory(mapAiCategoryToEnum(paramCat));
  }, [itemName, paramQty, paramCat]);

  // Local Mic Transcript Parser (e.g. "3 chicken" or "ek doodh")
  useEffect(() => {
    if (transcript && transcript.trim() !== '') {
      const lowerTrans = transcript.toLowerCase();
      
      // Extract numbers
      const numberMatch = lowerTrans.match(/\d+/);
      let extractedQty = numberMatch ? numberMatch[0] : '1';
      if (lowerTrans.includes('ek') || lowerTrans.includes('aik')) extractedQty = '1';
      if (lowerTrans.includes('do')) extractedQty = '2';
      if (lowerTrans.includes('teen')) extractedQty = '3';
      
      // Clean up the text to get just the item name
      let extractedName = lowerTrans
        .replace(/\d+/g, '') // remove numbers
        .replace(/ek|aik|do|teen|char|panch/g, '') // remove number words
        .replace(/add|save|krdo|kardo|kar|do/g, '') // remove command words
        .trim();

      if (extractedName) setName(extractedName);
      setQuantity(extractedQty);
      
      hapticService.trigger('light');
      TtsService.speak(`Maine ${extractedQty} ${extractedName || 'item'} likh diya hai. Scanner se expiry note karni hai, ya save karun?`);
    }
  }, [transcript]);

  const latestFormState = useRef({ name, quantity, category });
  useEffect(() => {
    latestFormState.current = { name, quantity, category };
  }, [name, quantity, category]);

  const handleSave = async () => {
    const dataToSave = latestFormState.current;
    if (!dataToSave.name.trim() || !user) {
      hapticService.trigger('error');
      return;
    }

    try {
      setLoading(true);
      const parsedQty = parseInt(dataToSave.quantity.replace(/[^0-9]/g, '')) || 1;
      const finalCategory = dataToSave.category ? String(dataToSave.category) : String(PantryCategory.OTHER);

      await PantryService.addPantryItem(user.uid, { 
        name: dataToSave.name.trim(), 
        category: finalCategory as PantryCategory, 
        quantity: parsedQty,
        unit: 'pieces',
        lowStockThreshold: 1,
        // Default to 14 days if not scanned
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() 
      });
      
      await hapticService.trigger('success');
      TtsService.speak(`${dataToSave.name} pantry mein save ho gaya hai.`);
      router.back();
    } catch (error) {
      console.error("Save Error:", error);
      TtsService.speak('Item save nahi ho saka.');
      await hapticService.trigger('heavy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout scrollable={true}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text, marginLeft: 15 }]}>Add Item</Text>
      </View>

      <View style={styles.methodsContainer}>
        <TouchableOpacity style={styles.methodBox} onPress={() => startListening()} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: isListening ? theme.danger : theme.backgroundSecondary }]}>
            <Ionicons name={isListening ? "mic" : "mic-outline"} size={32} color={isListening ? "#FFF" : theme.primary} />
          </View>
          <Text style={{ color: isListening ? theme.danger : theme.text, fontWeight: '600' }}>
            {isListening ? 'Listening...' : 'Voice'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.methodBox} onPress={() => router.push('/scanner')} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="barcode-outline" size={32} color={theme.primary} />
          </View>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Camera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Input label="Item Name" placeholder="e.g., Eggs, Milk" value={name} onChangeText={setName} icon="cube-outline" />
        <Input label="Quantity" placeholder="1" value={quantity} onChangeText={setQuantity} keyboardType="numeric" icon="layers-outline" />
        
        <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={{ paddingRight: SPACING.lg }}
        >
          {Object.values(PantryCategory).map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setCategory(cat as PantryCategory)}
              activeOpacity={0.8}
              style={[
                styles.catBadge, 
                category === cat ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }
              ]}
            >
              <Text style={{ 
                color: category === cat ? '#FFF' : theme.text,
                fontWeight: category === cat ? 'bold' : 'normal',
                textTransform: 'capitalize'
              }}>
                {String(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Button title="Confirm & Save" onPress={() => handleSave()} disabled={!name.trim() || isListening} loading={loading} fullWidth style={{ marginTop: SPACING.lg }} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, paddingTop: SPACING.sm },
  title: { ...TYPOGRAPHY.heading, fontSize: 24 },
  methodsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: theme.card, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: theme.border },
  methodBox: { alignItems: 'center', width: 80 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  form: { marginTop: SPACING.sm },
  label: { marginBottom: 10, fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryScroll: { marginBottom: 24, marginLeft: -4 },
  catBadge: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.full, marginRight: 10, marginLeft: 4 }
});