
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';

// Services & Constants
import { colors } from '@/src/constants/colors';
import { AuthService } from '@/src/services/firebase/auth.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';
import { modelLoaderService } from '@/src/services/ai/modelLoader.service';

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
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Replace with your actual logo asset path */}
        <Image 
          source={require('@/assets/images/seevia-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>SEEVIA</Text>
        <Text style={styles.subtitle}>Your eyes beyond the seen</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Using your brand color
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
    color: 'white',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default SplashScreen;
