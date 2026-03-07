import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Scrollview, TouchableOpacity } from 'react-native';
import { AuthService } from '@/src/services/firebase/auth.service';
import { PantryService } from '@/src/services/pantry/pantry.service';
import { ShoppingListService } from '@/src/services/pantry/shoppingList.service';
import hapticService from '@/src/services/common/haptic.service';
import { PantryItem } from '@/src/models/PantryItem';
import { colors } from '@/src/constants/colors';

/**
 * Seevia Home Screen
 * The central dashboard providing status updates and quick access to AI tools.
 */
const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [stats, setStats] = useState({ pantryCount: 0, shoppingCount: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;
    const items = await PantryService.getAllItems(user.uid);
    const shopping = await ShoppingListService.getShoppingList(user.uid);
    setStats({
      pantryCount: items.length,
      shoppingCount: shopping.filter(i => !i.isCollected).length
    });
  };

  const handleNavigate = (screen: string) => {
    hapticService.selection();
    navigation.navigate(screen);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => handleNavigate('PantryStack')}
        >
          <Text style={styles.statNumber}>{stats.pantryCount}</Text>
          <Text style={styles.statLabel}>Items in Pantry</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => handleNavigate('ShoppingStack')}
        >
          <Text style={styles.statNumber}>{stats.shoppingCount}</Text>
          <Text style={styles.statLabel}>To Buy</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.mainActionButton}
        onPress={() => handleNavigate('Scanner')}
      >
        <Text style={styles.actionButtonText}>Open AI Scanner</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Insights</Text>
        {/* Proactive insight logic from Module 3 would go here */}
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            You usually run out of Milk in 2 days. Should I add it to the list?
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingTop: 60 },
  greeting: { fontSize: 18, color: colors.textSecondary },
  userName: { fontSize: 28, fontWeight: 'bold', color: colors.primary },
  statsContainer: { flexDirection: 'row', padding: 16, justifyContent: 'space-between' },
  statCard: { 
    backgroundColor: colors.surface, 
    width: '48%', 
    padding: 20, 
    borderRadius: 16,
    elevation: 2 
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 14, color: colors.textSecondary },
  mainActionButton: {
    backgroundColor: colors.primary,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center'
  },
  actionButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  insightCard: { backgroundColor: colors.infoLight, padding: 16, borderRadius: 12 },
  insightText: { fontSize: 16, color: colors.infoText }
});

export default HomeScreen;
