import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenLayout from '@/components/common/ScreenLayout';
import Card from '@/components/common/Card';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/theme';

import { RecipeService, Recipe } from '@/services/pantry/recipe.service';
import { PantryService } from '@/services/pantry/pantry.service';
import { AuthService } from '@/services/firebase/auth.service';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

export default function RecipeScreen() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { speak } = useVoiceCommands();
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    loadSafeRecipes();
  }, []);

  const loadSafeRecipes = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const myPantryItems = await PantryService.getPantryItems(user.uid) || [];

      const allRecipes: Recipe[] = [
        { id: '1', title: 'Quick French Toast', ingredients: ['Milk', 'Bread', 'Eggs'], allergyTags: ['dairy', 'gluten', 'eggs'], category: 'Breakfast', prepTime: 10, instructions: [] },
        { id: '2', title: 'Oatmeal with Almonds', ingredients: ['Oats', 'Milk', 'Nuts'], allergyTags: ['nuts', 'dairy'], category: 'Breakfast', prepTime: 5, instructions: [] },
        { id: '3', title: 'Pasta Carbonara', ingredients: ['Pasta', 'Eggs', 'Cheese'], allergyTags: ['dairy', 'gluten', 'eggs'], category: 'Dinner', prepTime: 20, instructions: [] },
        { id: '4', title: 'Fresh Fruit Bowl', ingredients: ['Apple', 'Banana', 'Orange'], allergyTags: [], category: 'Snack', prepTime: 5, instructions: [] }
      ];

      const ranked = await RecipeService.generateRecommendations(myPantryItems, allRecipes, user.uid);
      setRecommendations(ranked);

      if (ranked.length > 0) {
        speak(`Maine aapki health profile aur pantry check ki hai. Aapke liye ${ranked[0].title} sab se behtar aur safe hai.`);
      } else {
        speak(`Abhi aapki pantry ke mutabiq koi safe recipe nahi mili.`);
      }

    } catch (error) {
      console.error('Failed to load recipes:', error);
      speak('Recipes load karne mein masla aaya.');
    } finally {
      setLoading(false);
    }
  };

  const renderRecipe = ({ item }: { item: any }) => (
    <Card style={styles.recipeCard}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.metaText}>{item.prepTime} mins • {item.category}</Text>
          </View>
        </View>

        {item.score >= 50 && (
          <View style={styles.badge}>
            <Ionicons name="leaf" size={10} color="#FFF" style={{ marginRight: 2 }} />
            <Text style={styles.badgeText}>LOW WASTE</Text>
          </View>
        )}
      </View>

      <View style={styles.reasoningBox}>
        {/* FIX: Replaced "sparkles-sharp" with valid icon "sparkles" */}
        <Ionicons name="sparkles" size={14} color={theme.primary} />
        <Text style={styles.reasonText}>
          {item.score >= 50 
            ? "Smart Match: Uses ingredients that are expiring soon!" 
            : "Good Match: You have most of the ingredients safe to eat."}
        </Text>
      </View>
    </Card>
  );

  return (
    <ScreenLayout scrollable={false}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Recipes</Text>
        <Text style={styles.subtitle}>Safe & personalized for your health profile.</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Curating safe recipes...</Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Ionicons name="restaurant-outline" size={64} color={theme.textTertiary} />
              <Text style={styles.emptyText}>No safe matches found.</Text>
              <Text style={styles.emptySubText}>Add more items to your pantry to get suggestions.</Text>
            </View>
          }
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.heading, fontSize: 28, color: theme.text },
  subtitle: { ...TYPOGRAPHY.body, color: theme.success, marginTop: 4 },
  listContent: { paddingBottom: 100 },
  recipeCard: { marginBottom: SPACING.md, padding: SPACING.md, borderLeftWidth: 4, borderLeftColor: theme.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, paddingRight: SPACING.sm },
  recipeTitle: { ...TYPOGRAPHY.subheading, fontSize: 18, fontWeight: '700', color: theme.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: theme.textSecondary, fontSize: 13, marginLeft: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  reasoningBox: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, backgroundColor: theme.backgroundSecondary, padding: SPACING.sm, borderRadius: RADIUS.sm },
  reasonText: { color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', marginLeft: 6, flex: 1 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  loadingText: { color: theme.primary, marginTop: SPACING.md, fontWeight: '600' },
  emptyText: { ...TYPOGRAPHY.heading, fontSize: 20, color: theme.text, marginTop: SPACING.md },
  emptySubText: { ...TYPOGRAPHY.body, color: theme.textSecondary, textAlign: 'center', marginTop: 8 },
});