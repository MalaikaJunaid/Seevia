import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

// Seevia Core Components & Theme
import { BackHeader } from '../../src/components/common/BackHeader';
import { Button } from '../../src/components/common/Button';
import { EmptyState } from '../../src/components/common/EmptyState';
import { FloatingMicButton } from '../../src/components/common/FloatingMicButton';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { ScreenLayout } from '../../src/components/common/ScreenLayout';
import { VoiceFeedbackBar } from '../../src/components/common/VoiceFeedbackBar';
import { PantryCard } from '../../src/components/pantry/PantryCard';
import { DARK_THEME as theme } from '../../src/theme/colors';
import TtsService from '../../src/services/voice/TtsService';
import WakePhraseListener from '../../src/services/voice/WakePhraseListener';
import { SPACING } from '../../src/theme';

// Mock Hook - Replace with your actual usePantry hook
const usePantryMock = () => ({
  items: [], // This will be populated from Firebase
  loading: false,
  deleteItem: async (id: string) => console.log('Delete', id),
});

export default function PantryScreen() {
  const router = useRouter();
  const { items, loading, deleteItem } = usePantryMock(); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    // Module 2: Auditory Guidance
    TtsService.speak('Pantry Manager active. You can say add item or scan barcode.');
  }, []);

  const handleStartListening = () => {
    setIsListening(true);
    WakePhraseListener.startListening((command) => {
      setTranscript(command);
      setIsListening(false);
      // Logic to handle "Add Milk" or "Delete Bread" would be routed here
    });
  };

  const handleAddItem = () => {
    TtsService.speak('Opening manual add screen');
    router.push('/add-item');
  };

  const handleScanBarcode = () => {
    TtsService.speak('Opening barcode scanner');
    router.push('/scanner');
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      TtsService.speak('Item removed from pantry');
    } catch (error) {
      TtsService.speak('Error removing item');
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <LoadingSpinner message="Accessing pantry memory..." />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false} padding={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <BackHeader
          title="Pantry Manager"
          subtitle="Smart inventory & expiry tracking"
          icon={<Ionicons name="archive" size={40} color={theme.primary} />}
        />

        {/* Voice Prompt Box */}
        <View style={styles.voicePromptContainer}>
          <View style={[styles.voicePromptBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.voiceDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.voicePromptText, { color: theme.primary }]}>
              {isListening ? "Listening..." : 'Say "Hey Seevia" to manage items'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Add Item"
            onPress={handleAddItem}
            icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Scan Barcode"
            onPress={handleScanBarcode}
            variant="outline"
            icon={<Ionicons name="barcode-outline" size={20} color={theme.primary} />}
            style={{ flex: 1 }}
          />
        </View>

        {/* Pantry List Header */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>
            Current Stock ({items.length})
          </Text>
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="archive-outline"
            title="Pantry is Empty"
            message="Scan a product to begin AI tracking"
            actionLabel="Add Your First Item"
            onAction={handleAddItem}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PantryCard
                item={item}
                onPress={() => router.push(`/pantry-detail?id=${item.id}`)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <FloatingMicButton onPress={handleStartListening} isListening={isListening} />
        <VoiceFeedbackBar message={transcript} visible={!!transcript} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  voicePromptContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  voicePromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  voiceDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm,
  },
  voicePromptText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  listHeader: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
});
