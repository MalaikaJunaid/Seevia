import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Integrations
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import { PantryService } from '@/services/pantry/pantry.service';
import { expiryService } from '@/services/pantry/expiry.service'; // 🛠️ FIXED: Used exported instance
import { AuthService } from '@/services/firebase/auth.service';
import { hapticService } from '@/services/common/haptic.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { PantryItem } from '@/models/PantryItem';

const PantryListScreen = () => {
  const router = useRouter();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const user = AuthService.getCurrentUser();

  const loadItems = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const pantryData = await PantryService.getAllItems(user.uid);
      setItems(pantryData);
    } catch (err) {
      console.error('Failed to load pantry items', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleReadList = async () => {
    if (items.length === 0) {
      await TextToSpeechService.speak("Your pantry is currently empty.");
      return;
    }
    const summary = items.map(i => `${i.quantity} ${i.unit} of ${i.name}`).join(', ');
    await TextToSpeechService.speak(`You have ${items.length} items. They are: ${summary}`);
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const status = expiryService.checkExpiryStatus(item); // 🛠️ FIXED: Instance call
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          hapticService.trigger('selection');
          router.push(`/pantry/${item.id}`);
        }}
        accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}. ${status.message}`}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>{item.quantity} {item.unit} • {item.category}</Text>
        </View>
        
        <View style={styles.statusBadge}>
          {status.isExpired ? (
            /* 🛠️ FIXED: Changed theme.error to theme.danger to match colors.ts */
            <View style={[styles.badge, { backgroundColor: theme.danger }]}>
              <Text style={styles.badgeText}>EXPIRED</Text>
            </View>
          ) : item.quantity <= (item.lowStockThreshold || 1) ? (
            <View style={[styles.badge, { backgroundColor: theme.warning }]}>
              <Text style={styles.badgeText}>LOW STOCK</Text>
            </View>
          ) : (
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Pantry</Text>
        <TouchableOpacity onPress={handleReadList} style={styles.voiceBtn}>
          <Ionicons name="volume-high" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadItems} 
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your pantry is empty. Start scanning!</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          hapticService.trigger('success');
          router.push('/pantry/add');
        }}
        accessibilityLabel="Add new item"
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: SPACING.lg, 
    paddingTop: 60 
  },
  title: { ...TYPOGRAPHY.display, color: theme.text },
  voiceBtn: { 
    padding: 10, 
    backgroundColor: theme.backgroundSecondary, 
    borderRadius: RADIUS.md 
  },
  listContent: { padding: SPACING.md, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: theme.backgroundSecondary, // 🛠️ Match theme surfaces
    padding: 16, 
    borderRadius: RADIUS.md, 
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2
  },
  itemInfo: { flex: 1 },
  itemName: { ...TYPOGRAPHY.subheading, color: theme.text },
  itemMeta: { ...TYPOGRAPHY.caption, color: theme.textSecondary, marginTop: 4 },
  statusBadge: { marginLeft: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: theme.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { ...TYPOGRAPHY.body, color: theme.textSecondary }
});

export default PantryListScreen;