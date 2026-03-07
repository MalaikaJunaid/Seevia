import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { ShoppingListService } from '@/src/services/pantry/shoppingList.service';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { AuthService } from '@/src/services/firebase/auth.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';

const ShoppingListScreen = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    if (!user) return;
    try {
      const list = await ShoppingListService.getShoppingList(user.uid);
      setItems(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollected = async (item: any) => {
    if (!user) return;
    hapticService.selection();
    
    try {
      await ShoppingListService.updateItemStatus(user.uid, item.id, !item.isCollected);
      
      if (!item.isCollected) {
        await TextToSpeechService.speak(`${item.name} marked as collected.`);
      }
      
      loadShoppingList(); // Refresh list
    } catch (error) {
      console.error(error);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.itemCard, item.isCollected && styles.collectedItem]} 
      onPress={() => toggleCollected(item)}
    >
      <Ionicons 
        name={item.isCollected ? "checkbox" : "square-outline"} 
        size={24} 
        color={item.isCollected ? colors.success : colors.primary} 
      />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.isCollected && styles.collectedText]}>
          {item.name}
        </Text>
        {item.isAutoAdded && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI SUGGESTED</Text>
          </View>
        )}
      </View>
      <Text style={styles.quantity}>{item.quantity} {item.unit}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <TouchableOpacity 
          style={styles.voiceBtn}
          onPress={() => TextToSpeechService.speak("Ready to add items via voice.")}
        >
          <Ionicons name="mic" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Your list is clear. AI is monitoring your pantry!</Text>
          }
        />
      )}
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
    paddingTop: 60,
    backgroundColor: colors.surface 
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  voiceBtn: { 
    backgroundColor: colors.primary, 
    padding: 12, 
    borderRadius: 50,
    elevation: 3 
  },
  listContent: { padding: 20 },
  itemCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10,
    elevation: 1
  },
  collectedItem: { opacity: 0.6, backgroundColor: '#f0f0f0' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 18, fontWeight: '600', color: colors.text },
  collectedText: { textDecorationLine: 'line-through' },
  aiBadge: { 
    backgroundColor: colors.infoLight, 
    alignSelf: 'flex-start', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4,
    marginTop: 4 
  },
  aiBadgeText: { fontSize: 10, color: colors.infoText, fontWeight: 'bold' },
  quantity: { fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 100, color: colors.textSecondary, fontSize: 16 }
});

export default ShoppingListScreen;
