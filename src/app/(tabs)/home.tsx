import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Theme & Services
import { DARK_THEME as theme } from '../../src/theme/colors';
import TtsService from '../../src/services/voice/TtsService';
import { SPACING } from '../../src/theme';

const modules = [
  { label: 'Vision', icon: 'eye', route: '/scanner', desc: 'Scan products & expiration' },
  { label: 'Pantry', icon: 'cart', route: '/pantry', desc: 'Check stock & smart alerts' },
  { label: 'Emergency', icon: 'alert-circle', route: '/emergency', desc: 'SOS & Fall detection' },
  { label: 'Navigation', icon: 'navigate', route: '/navigation', desc: 'Save Mart PWD Guide' },
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Initializing the AI greeting using Module 2 TTS
    TtsService.speak("Welcome back. How can I assist you today?");
  }, []);

  const handlePress = (route: string, label: string) => {
    TtsService.speak(`Opening ${label}`);
    router.push(route as any);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.text }]}>
          Hello, User
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your Seevia assistant is active.
        </Text>
      </View>

      <View style={styles.grid}>
        {modules.map((item) => (
          <TouchableOpacity
            key={item.route}
            activeOpacity={0.7}
            onPress={() => handlePress(item.route, item.label)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
              <Ionicons name={item.icon as any} size={32} color={theme.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Proactive AI Alert Card (Module 3 Integration) */}
      <View style={[styles.alertCard, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
        <Ionicons name="notifications" size={24} color="#FFF" />
        <Text style={styles.alertText}>
          Pantry Alert: Milkpak is running low.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  grid: {
    padding: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  alertCard: {
    margin: SPACING.lg,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
  },
  alertText: {
    color: '#FFF',
    fontWeight: '700',
    flex: 1,
  },
});
