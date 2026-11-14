import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// CRITICAL FIX: Default Imports (Removed curly braces)
import ScreenLayout from '../components/common/ScreenLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

import { DARK_THEME as theme } from '../theme/colors';
import { SPACING, TYPOGRAPHY } from '../theme';

// Unified Services
import { AuthService } from '../services/firebase/auth.service';
import { FirestoreService } from '../services/firebase/firestore.service';
import { DeviceMemoryService } from '../services/common/deviceMemory.service';
// @ts-ignore
import TtsService from '../services/voice/TtsService';

const SPLASH_DURATION_MS = 6000; // Enforce 6 seconds splash

// Define matching roles based on your userProfile.service
type UserRole = 'pwd' | 'caregiver' | 'volunteer';

export default function Index() {
  const router = useRouter();
  
  // States
  const [showSplash, setShowSplash] = useState(true);
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('pwd'); // Default to PWD
  const [isLoading, setIsLoading] = useState(false); // Controls button loading state

  useEffect(() => {
    let isMounted = true;

    const bootApp = async () => {
      const startTime = Date.now();
      let nextDestination = 'auth'; // Default fallback

      try {
        // 1. Check if there is an active Firebase session
        const user = AuthService.getCurrentUser();

        if (user) {
          // 2. Fetch user document to check onboarding status
          const userDoc = await FirestoreService.getDocument('users', user.uid);

          if (userDoc && (userDoc.setupComplete || userDoc.isSetupComplete)) {
            // 3. User completed onboarding, route to their dashboard
            nextDestination = '/(tabs)';
          } else {
            // 4. User needs to complete onboarding
            nextDestination = '/onboarding';
          }
        } else {
          // 5. No active session, check device memory for auto-login
          const isMemorized = await DeviceMemoryService.isDeviceMemorized();
          if (isMemorized) {
            const memory = await DeviceMemoryService.getDeviceMemory();
            if (memory) {
              logger.info('Boot', `Device remembered for ${memory.userEmail}, attempting auto-login`);
              // Note: We could attempt auto-login here with stored token, but for security
              // we'll still show auth screen. Device memory just pre-fills email.
              setEmail(memory.userEmail);
            }
          }
        }
      } catch (e) {
        console.error("Navigation check error:", e);
        nextDestination = 'auth';
      }

      // 6. Calculate how much time has passed vs our forced 6-second splash
      const elapsedTime = Date.now() - startTime;
      const timeRemaining = SPLASH_DURATION_MS - elapsedTime;

      // 7. Force the app to wait out the remainder of the 6 seconds
      if (timeRemaining > 0) {
        await new Promise(resolve => setTimeout(resolve, timeRemaining));
      }

      // 8. Execute routing after the 6 seconds are completely up
      if (isMounted) {
        if (nextDestination === 'auth') {
          setShowSplash(false);
          TtsService.speak("Welcome to Seevia. Please sign in or create an account.");
        } else {
          router.replace(nextDestination as any);
        }
      }
    };

    bootApp();

    return () => { isMounted = false; };
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      TtsService.speak("Please enter both email and password.");
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    TtsService.speak(isLogin ? "Logging in..." : `Creating account as ${selectedRole}...`);

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const user = await AuthService.signInWithEmail(email, password);
        TtsService.speak("Login successful.");
        
        // Check if this existing user finished onboarding
        const userDoc = await FirestoreService.getDocument('users', user.uid);
        if (userDoc && (userDoc.setupComplete || userDoc.isSetupComplete)) {
          // Route based on role
          const roleRoute = await AuthService.getRouteForRole(user.uid);
          router.replace(roleRoute as any);
        } else {
          router.replace('/onboarding');
        }
      } else {
        // --- SIGNUP FLOW ---
        await AuthService.signUpWithRole(email, password, selectedRole);
        TtsService.speak("Account created successfully. Let's get you set up.");
        router.replace('/onboarding');
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      TtsService.speak("Authentication failed. Please try again.");
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole, spokenText: string) => {
    setSelectedRole(role);
    TtsService.speak(spokenText);
  };

  // ------------------------------------------------------------------
  // UI 1: SPLASH SCREEN - Always show for 6 seconds
  // ------------------------------------------------------------------
  if (showSplash) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.background }]}>
        <Image 
          source={require('../assets/images/splash.png')} 
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
        <Text style={[styles.splashText, { color: theme.textSecondary }]} allowFontScaling={true}>
          Initializing Seevia...
        </Text>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // UI 2: AUTHENTICATION SCREEN
  // ------------------------------------------------------------------
  return (
    <ScreenLayout scrollable={true} padding={true}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        
        {/* Header Section */}
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/Seevia-Logo.jpg')} 
            style={styles.authLogo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} allowFontScaling={true}>
            Your eyes beyond the seen.
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, isLogin ? styles.activeTab : styles.inactiveTab]} 
            onPress={() => { setIsLogin(true); TtsService.speak("Sign In selected"); }}
          >
            <Text style={[styles.tabText, { color: isLogin ? '#FFF' : theme.textSecondary }]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tab, !isLogin ? styles.activeTab : styles.inactiveTab]} 
            onPress={() => { setIsLogin(false); TtsService.speak("Create Account selected"); }}
          >
            <Text style={[styles.tabText, { color: !isLogin ? '#FFF' : theme.textSecondary }]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          
          {/* ROLE SELECTOR */}
          {!isLogin && (
            <View style={styles.roleContainer}>
              <Text style={[styles.roleLabel, { color: theme.textSecondary }]} allowFontScaling={true}>
                I am signing up as a:
              </Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity 
                  style={[styles.roleBtn, selectedRole === 'pwd' && styles.roleBtnActive]}
                  onPress={() => handleRoleSelect('pwd', "Visually Impaired User selected")}
                >
                  <Ionicons name="eye-off-outline" size={20} color={selectedRole === 'pwd' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.roleBtnText, { color: selectedRole === 'pwd' ? '#FFF' : theme.textSecondary }]}>User</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.roleBtn, selectedRole === 'caregiver' && styles.roleBtnActive]}
                  onPress={() => handleRoleSelect('caregiver', "Caregiver selected")}
                >
                  <Ionicons name="heart-outline" size={20} color={selectedRole === 'caregiver' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.roleBtnText, { color: selectedRole === 'caregiver' ? '#FFF' : theme.textSecondary }]}>Caregiver</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.roleBtn, selectedRole === 'volunteer' && styles.roleBtnActive]}
                  onPress={() => handleRoleSelect('volunteer', "Volunteer selected")}
                >
                  <Ionicons name="hand-right-outline" size={20} color={selectedRole === 'volunteer' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.roleBtnText, { color: selectedRole === 'volunteer' ? '#FFF' : theme.textSecondary }]}>Volunteer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.inputSpacing}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              placeholder={isLogin ? "Enter your password" : "Create password (min 6 chars)"}
              secureTextEntry={true}
            />
          </View>

          <Button
            title={isLoading ? "Please wait..." : (isLogin ? "Log In to Seevia" : "Create Account")}
            onPress={handleAuth}
            disabled={isLoading}
            style={styles.mainButton}
            icon={<Ionicons name={isLogin ? "log-in-outline" : "person-add-outline"} size={24} color="#FFF" />}
          />
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: '#FFF', marginTop: 10, fontWeight: 'bold' }}>
              {isLogin ? "Authenticating..." : "Creating Account..."}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

// Import logger for consistency
import { logger } from '../utils/logger';

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 200, height: 200 },
  splashText: { ...TYPOGRAPHY.caption, marginTop: 15, fontWeight: '600' },
  container: { flex: 1, justifyContent: 'center', paddingBottom: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  authLogo: { width: 100, height: 100, marginBottom: SPACING.sm },
  subtitle: { ...TYPOGRAPHY.body, fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 4, marginBottom: SPACING.lg, borderWidth: 1, borderColor: theme.cardBorder },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: theme.primary },
  inactiveTab: { backgroundColor: 'transparent' },
  tabText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  formContainer: { width: '100%' },
  roleContainer: { marginBottom: SPACING.md },
  roleLabel: { ...TYPOGRAPHY.body, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 8, gap: 4 },
  roleBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  roleBtnText: { fontSize: 12, fontWeight: '700' },
  inputSpacing: { marginBottom: SPACING.md },
  mainButton: { marginTop: SPACING.sm, paddingVertical: 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12 },
});