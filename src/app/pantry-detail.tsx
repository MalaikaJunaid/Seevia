import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Seevia Core Components & Theme
import { BackHeader } from '../src/components/common/BackHeader';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { ScreenLayout } from '../src/components/common/ScreenLayout';
import { DARK_THEME as theme } from '../src/theme/colors';
import TtsService from '../src/services/voice/TtsService';
import HealthGuard from '../src/services/pantry/HealthGuard';
import { SPACING, TYPOGRAPHY } from '../src/theme';

export default function PantryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  // Mock Data - In 60% Defense, this will be fetched via id from Firebase
  const [item, setItem] = useState({
    id: id,
    name: 'Milkpak 1L',
    quantity: 2,
    expiry: '2026-03-25',
    predictedDays: 3, // Logic from ProactiveBrain.js
    ingredients: ['Dairy', 'Vitamin D'],
    status: 'Safe'
  });

  useEffect(() => {
    // Auditory feedback for accessibility
    const statusMsg = `${item.name}. ${item.quantity} units remaining. Expires in ${item.predictedDays} days. Status is ${item.status}.`;
    TtsService.speak(statusMsg);
  }, [item]);

  const handleDelete = () => {
    TtsService.speak(`Removing ${item.name} from pantry.`);
    router.back();
  };

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <BackHeader title="Item Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Main Product Card */}
        <Card style={styles.mainCard}>
          <View style={[styles.iconBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="cube" size={50} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.quantity, { color: theme.textSecondary }]}>
            Current Stock: {item.quantity} Units
          </Text>
        </Card>

        {/* AI Prediction Card (Module 3 Core) */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Insight</Text>
        </View>
        <Card style={[styles.insightCard, { borderColor: theme.primary }]}>
          <View style={styles.row}>
            <Ionicons name="hourglass-outline" size={24} color={theme.primary} />
            <View style={styles.textColumn}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>Depletion Forecast</Text>
              <Text style={[styles.insightValue, { color: theme.primary }]}>
                Empty in ~{item.predictedDays} Days
              </Text>
            </View>
          </View>
        </Card>

        {/* Health & Safety (Module 1 & 3 Integration) */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Safety Guard</Text>
        </View>
        <Card>
          <View style={styles.row}>
            <Ionicons 
              name={item.status === 'Safe' ? "checkmark-circle" : "warning"} 
              size={24} 
              color={item.status === 'Safe' ? theme.success : theme.danger} 
            />
            <Text style={[styles.statusText, { color: theme.text }]}>
              {item.status === 'Safe' ? 'Verified Safe for Consumption' : 'Allergy Warning Detected'}
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <Button 
            title="Update Quantity" 
            onPress={() => {}} 
            style={{ marginBottom: SPACING.md }} 
          />
          <Button 
            title="Remove Item" 
            variant="outline" 
            onPress={handleDelete} 
            style={{ borderColor: theme.danger }}
            textStyle={{ color: theme.danger }}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg },
  mainCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  iconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800' },
  quantity: { fontSize: 18, marginTop: 5 },
  sectionHeader: { marginTop: SPACING.xl, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  insightCard: { borderLeftWidth: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  textColumn: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: '600' },
  insightValue: { fontSize: 18, fontWeight: 'bold' },
  statusText: { fontSize: 16, fontWeight: '500' },
  actionContainer: { marginTop: SPACING.xxl, marginBottom: 50 }
});
