
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';

// Services & Constants
import { DARK_THEME as theme } from '@/theme/colors';
import { AuthService } from '@/services/firebase/auth.service';
import { TextToSpeechService } from '@/services/voice/textToSpeech.service';
import { hapticService } from '@/services/common/haptic.service';
import { modelLoaderService } from '@/services/ai/modelLoader.service';

const SplashScreen = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Start Animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Initialise System & Navigate
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Multimodal Welcome
      hapticService.trigger('success');
      await TextToSpeechService.speak("Welcome to Seevia");

      // Warm up AI models in the background
      await modelLoaderService.init();

      // Check Session & Routing
      setTimeout(() => {
        const user = AuthService.getCurrentUser();
        if (user) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/auth/login');
        }
      }, 2500); // Allow time for the logo to be seen
    } catch (error) {
      console.error("Initialization failed", error);
      router.replace('/auth/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Replace with your actual logo asset path */}
        <Image 
          source={require('@/assets/images/seevia-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme.primary }]}>SEEVIA</Text>
        <Text style={[styles.byText, { color: theme.text }]}>by</Text>
        <View style={styles.brailleContainer}>
          <View style={[styles.brailleDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.brailleDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.brailleDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.brailleDot, { backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your AI assistant for the world you feel</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 8,
  },
  byText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  brailleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  brailleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});

export default SplashScreen;
