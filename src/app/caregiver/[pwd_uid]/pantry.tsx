import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Core Components
import ScreenLayout from '@/components/common/ScreenLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

// Theme & Services
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/theme';
import { FirestoreService } from '@/services/firebase/firestore.service';
import { logger } from '@/utils/logger';

// Interface for YOLO-scanned pantry items
interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  isLowStock: boolean;
}

export default function PWDPantryScreen() {
  const router = useRouter();
  const { pwd_uid, pwd_name } = useLocalSearchParams<{ pwd_uid: string; pwd_name: string }>();
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<PantryItem[]>([]);

  useEffect(() => {
    if (pwd_uid) {
      loadPantryData();
    }
  }, [pwd_uid]);

  const loadPantryData = async () => {
    try {
      setLoading(true);
      
      // In production, this fetches from the PWD's 'pantry' subcollection in Firestore.
      // We are using realistic mock data here to simulate the YOLOv11 output.
      setTimeout(() => {
        const mockInventory: PantryItem[] = [
          { id: '1', name: 'Nestle Milkpak', category: 'Dairy', quantity: 1, expiryDate: '2026-05-04', daysUntilExpiry: 2, isLowStock: true },
          { id: '2', name: 'National Ketchup', category: 'Pantry', quantity: 1, expiryDate: '2026-12-10', daysUntilExpiry: 220, isLowStock: false },
          { id: '3', name: 'Dawn Bread (Large)', category: 'Bakery', quantity: 0, expiryDate: '2026-05-01', daysUntilExpiry: -1, isLowStock: true },
          { id: '4', name: 'Lipton Yellow Label', category: 'Beverage', quantity: 2, expiryDate: '2027-01-15', daysUntilExpiry: 258, isLowStock: false },
        ];
        
        // Sort items so urgent ones (low stock/expiring) are at the top
        mockInventory.sort((a, b) => (a.daysUntilExpiry || 999) - (b.daysUntilExpiry || 999));
        setInventory(mockInventory);
        setLoading(false);
      }, 800);

    } catch (error) {
      logger.error('PANTRY_SCREEN', 'Failed to load pantry data', error);
      setLoading(false);
    }
  };

  const handleAddToShoppingList = (item: PantryItem) => {
    // This will push the item to the shared shopping list in Firestore
    Alert.alert(
      "Added to List",
      `"${item.name}" has been added to the shared shopping list. Seevia will remind ${pwd_name} next time they visit a store.`
    );
  };

  const getExpiryColor = (days: number | null) => {
    if (days === null) return theme.textSecondary;
    if (days < 0) return theme.danger; // Expired
    if (days <= 3) return '#FFA500'; // Expiring soon (Orange)
    return theme.success; // Good
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'dairy': return 'water';
      case 'bakery': return 'cafe';
      case 'beverage': return 'beer';
      default: return 'nutrition';
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 15 }}>Syncing YOLO Scans...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Quick stats calculations
  const expiringItemsCount = inventory.filter(i => i.daysUntilExpiry !== null && i.daysUntilExpiry <= 3).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0 || i.isLowStock).length;

  return (
    <ScreenLayout scrollable={false} padding={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Button 
          title="Back" 
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Pantry Hub</Text>
          <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>
            Viewing {pwd_name}'s inventory
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Quick Insights Row */}
        <View style={styles.insightsRow}>
          <Card style={[styles.insightCard, { borderColor: expiringItemsCount > 0 ? '#FFA500' : theme.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.insightValue, { color: expiringItemsCount > 0 ? '#FFA500' : theme.text }]}>
              {expiringItemsCount}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>Expiring Soon</Text>
          </Card>
          
          <Card style={[styles.insightCard, { borderColor: outOfStockCount > 0 ? theme.danger : theme.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.insightValue, { color: outOfStockCount > 0 ? theme.danger : theme.text }]}>
              {outOfStockCount}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>Low Stock</Text>
          </Card>

          <Card style={styles.insightCard}>
            <Text style={[styles.insightValue, { color: theme.text }]}>{inventory.length}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>Total Items</Text>
          </Card>
        </View>

        {/* Inventory List */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Inventory</Text>
        
        {inventory.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 30 }}>
            <Ionicons name="basket-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.textSecondary, marginTop: 15, textAlign: 'center' }}>
              The pantry is empty. Items scanned by {pwd_name} will appear here automatically.
            </Text>
          </Card>
        ) : (
          inventory.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                  <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name={getCategoryIcon(item.category)} size={20} color={theme.primary} />
                  </View>
                  <View>
                    <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.quantityBadge}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>x{item.quantity}</Text>
                </View>
              </View>

              <View style={styles.itemFooter}>
                <View style={styles.expiryContainer}>
                  <Ionicons name="time-outline" size={16} color={getExpiryColor(item.daysUntilExpiry)} />
                  <Text style={{ color: getExpiryColor(item.daysUntilExpiry), fontSize: 13, marginLeft: 5, fontWeight: '600' }}>
                    {item.daysUntilExpiry !== null 
                      ? (item.daysUntilExpiry < 0 ? 'Expired' : item.daysUntilExpiry === 0 ? 'Expires today' : `Expires in ${item.daysUntilExpiry} days`)
                      : 'No expiry date'}
                  </Text>
                </View>

                {/* Show Add to List button if low stock or expired */}
                {(item.isLowStock || (item.daysUntilExpiry !== null && item.daysUntilExpiry <= 3)) && (
                  <Button 
                    title="Add to List" 
                    variant="outline" 
                    icon={<Ionicons name="add" size={16} color={theme.primary} />}
                    onPress={() => handleAddToShoppingList(item)}
                    style={styles.addButton}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: SPACING.lg,
    paddingTop: 50,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: { paddingHorizontal: 15, paddingVertical: 8, height: 'auto' },
  headerTitleContainer: { flex: 1 },
  title: { ...TYPOGRAPHY.display, fontSize: 24, marginBottom: 2 },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  
  // Insights
  insightsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl, gap: 10 },
  insightCard: { flex: 1, alignItems: 'center', padding: SPACING.md },
  insightValue: { ...TYPOGRAPHY.display, fontSize: 28, marginBottom: 5 },
  
  sectionTitle: { ...TYPOGRAPHY.small, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  
  // Item Cards
  itemCard: { marginBottom: SPACING.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  itemTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  itemName: { ...TYPOGRAPHY.subheading, fontWeight: '700', fontSize: 16 },
  quantityBadge: { backgroundColor: theme.textSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingTop: 10 },
  expiryContainer: { flexDirection: 'row', alignItems: 'center' },
  addButton: { height: 35, paddingVertical: 0, paddingHorizontal: 10 },
});