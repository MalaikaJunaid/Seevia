import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '@/services/firebase/auth.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { ShoppingListService } from '@/services/pantry/shoppingList.service';
import hapticService from '@/services/common/haptic.service';
import { PantryItem } from '@/models/PantryItem';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';
import BrailleDots from '@/components/common/BrailleDots';
import Button from '@/components/common/Button';

/**
 * Seevia Home Screen
 * The central dashboard providing status updates and quick access to AI tools.
 * Matches mockup design with dark theme, orange accents, and voice-first interaction.
 */
const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [stats, setStats] = useState({ pantryCount: 0, shoppingCount: 0 });
  const [listeningToVoice, setListeningToVoice] = useState(false);

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

  const handleVoiceInput = () => {
    setListeningToVoice(true);
    hapticService.trigger('success');
    setTimeout(() => setListeningToVoice(false), 2000);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Braille Header */}
      <View style={styles.headerBar}>
        <BrailleDots />
      </View>

      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { color: theme.textTertiary }]}>Good afternoon,</Text>
        <Text style={[styles.userName, { color: theme.text }]}>{user?.displayName || 'User'}</Text>
        <Text style={[styles.status, { color: theme.primary }]}>Ready to assist you</Text>
      </View>

      {/* Voice Input Section */}
      <View style={[styles.voiceBox, { borderColor: listeningToVoice ? theme.primary : theme.cardBorder }]}>
        <Ionicons 
          name={listeningToVoice ? "mic" : "mic-outline"} 
          size={20} 
          color={listeningToVoice ? theme.primary : theme.textSecondary}
        />
        <Text style={[styles.voiceHint, { color: listeningToVoice ? theme.primary : theme.textSecondary }]}>
          {listeningToVoice ? "Listening..." : 'Tap mic or say "Hey Seevia"'}
        </Text>
      </View>

      {/* Feature Cards */}
      <View style={styles.featuresSection}>
        <TouchableOpacity 
          style={[styles.featureCard, { backgroundColor: theme.card }]}
          onPress={() => handleNavigate('PantryStack')}
          accessible={true}
          accessibilityLabel="Pantry Manager"
          accessibilityRole="button"
        >
          <Ionicons name="cube-outline" size={28} color={theme.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Pantry Manager</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Track food expiry and manage inventory</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.featureCard, { backgroundColor: theme.card }]}
          onPress={() => handleNavigate('ShoppingStack')}
          accessible={true}
          accessibilityLabel="Shopping Assistant"
          accessibilityRole="button"
        >
          <Ionicons name="bag-check-outline" size={28} color={theme.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Shopping Assistant</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Smart shopping with product recognition</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.featureCard, { backgroundColor: theme.card }]}
          onPress={() => handleNavigate('Navigation')}
          accessible={true}
          accessibilityLabel="Navigation"
          accessibilityRole="button"
        >
          <Ionicons name="location-outline" size={28} color={theme.primary} />
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Navigation</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Voice-guided indoor and outdoor navigation</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats at bottom */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.pantryCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pantry Items</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.shoppingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>To Buy</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerBar: { 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm 
  },
  greetingSection: { 
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  greeting: { 
    fontSize: 16, 
    fontWeight: '400',
  },
  userName: { 
    fontSize: 28, 
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  status: { 
    fontSize: 12,
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
  voiceBox: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  voiceHint: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  featuresSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureCard: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  cardContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  statsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  statCard: { 
    flex: 1,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: { 
    fontSize: 32, 
    fontWeight: '800',
  },
  statLabel: { 
    fontSize: 12, 
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
});

export default HomeScreen;
