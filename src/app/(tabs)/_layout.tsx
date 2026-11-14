/**
 * Seevia Tab Navigator Layout
 * Bottom navigation for main app sections
 * Matches mockup design with accessibility features
 */

import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Core Services & Theme
import { DARK_THEME as colors } from '@/theme/colors';
import { useAccessibility } from '@/hooks/useAccessibility';
import { AuthService } from '@/services/firebase/auth.service';

// 🛠️ FIXED: Correctly pointing to your actual FloatingMicButton component
import FloatingMicButton from '@/components/common/FloatingMicButton'; 

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { announceForAccessibility } = useAccessibility();
  
  // 🛠️ DEMO-PROOF FIX: State to hold the active user's role
  const [userRole, setUserRole] = useState<'pwd' | 'caregiver' | 'volunteer' | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = AuthService.getCurrentUser();
        if (user) {
          const role = await AuthService.getUserRole(user.uid);
          setUserRole(role as 'pwd' | 'caregiver' | 'volunteer');
        }
      } catch (error) {
        console.error('Failed to fetch user role for Tab Layout:', error);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.cardBorder, 
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            height: 60 + insets.bottom,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          // Accessibility
          tabBarAccessibilityLabel: 'Main navigation',
        }}
      >
        {/* Index route — hidden, used as dashboard redirect */}
        <Tabs.Screen
          name="index"
          options={{ href: null, title: 'Dashboard' }}
        />

        {/* Home Tab - Dashboard */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Navigate to home dashboard',
          }}
          listeners={{
            tabPress: () => {
              announceForAccessibility('Home screen opened');
            },
          }}
        />

        {/* Pantry Tab - Kitchen Inventory */}
        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Pantry',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Navigate to pantry manager',
          }}
          listeners={{
            tabPress: () => {
              announceForAccessibility('Pantry Manager opened');
            },
          }}
        />

        {/* Shopping Tab - Navigation Assistant */}
        <Tabs.Screen
          name="shopping"
          options={{
            title: 'Navigate',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="navigate" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Navigate to store navigation assistant',
          }}
          listeners={{
            tabPress: () => {
              announceForAccessibility('Navigation assistant opened');
            },
          }}
        />

        {/* Emergency Tab - SOS */}
        <Tabs.Screen
          name="emergency"
          options={{
            title: 'Emergency',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="alert-circle" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Navigate to emergency controls',
          }}
          listeners={{
            tabPress: () => {
              announceForAccessibility('Emergency screen opened');
            },
          }}
        />

        {/* Settings Tab - Preferences */}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Navigate to settings',
          }}
          listeners={{
            tabPress: () => {
              announceForAccessibility('Settings opened');
            },
          }}
        />
      </Tabs>

      {/* 🛠️ DEMO-PROOF FIX: The Voice Orchestrator Mic will ONLY render for visually impaired users */}
      {userRole === 'pwd' && (
        <FloatingMicButton onPress={() => DeviceEventEmitter.emit('TRIGGER_GLOBAL_MIC')} />
      )}
    </>
  );
}