import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { ExpiryService } from '@/src/services/pantry/expiry.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { PantryItem } from '@/src/models/PantryItem';

const PantryListScreen = () => {
  const router = useRouter();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const user = AuthService.getCurrentUser();

  const loadItems = async () => {
    if (!user) return;
    setRefreshing(true);
    const pantryData = await PantryService.getAllItems(user.uid);
    setItems(pantryData);
    setRefreshing(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleReadList = async () => {
    const summary = items.map(i => `${i.quantity} ${i.unit} of ${i.name}`).join(', ');
    await TextToSpeechService.speak(`You have ${items.length} items in your pantry. They are: ${summary}`);
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const status = ExpiryService.checkExpiryStatus(item);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          hapticService.selection();
          router.push(`/pantry/${item.id}`);
        }}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>{item.quantity} {item.unit} • {item.category}</Text>
        </View>
        
        <View style={styles.statusBadge}>
          {status.isExpired ? (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>EXPIRED</Text>
            </View>
          ) : item.quantity <= item.lowStockThreshold ? (
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Text style={styles.badgeText}>LOW STOCK</Text>
            </View>
          ) : (
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
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
          <Ionicons name="volume-high" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadItems} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Your pantry is empty. Start scanning!</Text>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          hapticService.trigger('success');
          router.push('/pantry/add');
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 60 
  },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text },
  voiceBtn: { padding: 10, backgroundColor: colors.surface, borderRadius: 12 },
  listContent: { padding: 15, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: colors.surface, 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  itemMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  statusBadge: { marginLeft: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textSecondary }
});

export default PantryListScreen;
