import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { AuthService } from '@/src/services/firebase/auth.service';
import { FirestoreService } from '@/src/services/firebase/firestore.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { Button } from '@/src/components/common/Button';

const ProductHealthCheckScreen = () => {
  const router = useRouter();
  const { productData } = useLocalSearchParams();
  const product = JSON.parse(productData as string);
  
  const [safetyStatus, setSafetyStatus] = useState<'checking' | 'safe' | 'danger'>('checking');
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    performSafetyCheck();
  }, []);

  const performSafetyCheck = async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    // Fetch user health profile
    const profile = await FirestoreService.getDocument<any>('users', user.uid);
    const userAllergies = profile?.allergies || [];
    
    // Simulate Ingredient extraction from AI Vision
    const productIngredients = product.ingredients || []; 
    
    const foundConflicts = userAllergies.filter((allergy: string) => 
      productIngredients.some((ing: string) => ing.toLowerCase().includes(allergy.toLowerCase()))
    );

    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setSafetyStatus('danger');
      hapticService.sosHeartbeat();
      TextToSpeechService.speak(`Warning! This product contains ${foundConflicts.join(', ')}. It is not safe for you.`);
    } else {
      setSafetyStatus('safe');
      hapticService.trigger('success');
      TextToSpeechService.speak("This product is safe based on your health profile.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: safetyStatus === 'danger' ? '#FFF5F5' : colors.background }]}>
      <View style={styles.header}>
        <Ionicons 
          name={safetyStatus === 'danger' ? "alert-circle" : "checkmark-circle"} 
          size={80} 
          color={safetyStatus === 'danger' ? colors.error : colors.success} 
        />
        <Text style={[styles.statusTitle, { color: safetyStatus === 'danger' ? colors.error : colors.success }]}>
          {safetyStatus === 'danger' ? "Safety Warning" : "Product Safe"}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productCategory}>{product.category}</Text>
        </View>

        {safetyStatus === 'danger' && (
          <View style={styles.dangerBox}>
            <Text style={styles.dangerTitle}>Conflict Detected:</Text>
            {conflicts.map((item, index) => (
              <Text key={index} style={styles.conflictItem}>• {item.toUpperCase()}</Text>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            This check is based on your profile settings. Seevia cross-referenced the detected ingredients with your medical records.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={safetyStatus === 'danger' ? "Discard Item" : "Add to Pantry"} 
          onPress={() => router.replace('/(tabs)/pantry')}
          style={{ backgroundColor: safetyStatus === 'danger' ? colors.error : colors.primary }}
        />
        <Button 
          title="Back to Scanner" 
          variant="outline" 
          onPress={() => router.back()} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 20 },
  statusTitle: { fontSize: 32, fontWeight: '900', marginTop: 10 },
  content: { padding: 25 },
  productInfo: { alignItems: 'center', marginBottom: 30 },
  productName: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  productCategory: { fontSize: 16, color: colors.textSecondary },
  dangerBox: { backgroundColor: 'white', padding: 20, borderRadius: 16, borderLeftWidth: 8, borderLeftColor: colors.error, elevation: 3 },
  dangerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.error, marginBottom: 10 },
  conflictItem: { fontSize: 16, fontWeight: '600', color: colors.text },
  infoCard: { marginTop: 30, padding: 15, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12 },
  infoText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  footer: { padding: 20, gap: 10, paddingBottom: 40 }
});

export default ProductHealthCheckScreen;
