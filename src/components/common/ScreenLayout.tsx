import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { SPACING } from '@/src/theme';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  style?: ViewStyle;
}

/**
 * Global Screen Wrapper for Seevia.
 * Manages Safe Areas, Keyboard Avoidance, and Branding.
 */
export function ScreenLayout({
  children,
  scrollable = true,
  padding = true,
  style,
}: ScreenLayoutProps) {

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.background,
    },
    style,
  ];

  const contentStyle = [
    padding && styles.padding,
  ];

  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      );
    }
    return <View style={[styles.flex, contentStyle]}>{children}</View>;
  };

  return (
    <SafeAreaView style={containerStyle} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  padding: {
    padding: SPACING.md,
  },
});
