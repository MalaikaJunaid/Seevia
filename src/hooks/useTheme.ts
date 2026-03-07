import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Seevia Core Imports
import { THEME, COLORS } from '@/src/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof COLORS.light | typeof COLORS.dark;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Seevia Theme Provider
 * Wraps the application to provide persistent dark/light mode state.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  
  // Determine actual theme based on mode
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
    
  const activeTheme = isDark ? COLORS.dark : COLORS.light;

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('@seevia_theme_mode');
        if (saved) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    loadThemePreference();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('@seevia_theme_mode', mode);
      await Haptics.selectionAsync(); // Tactile confirmation
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ 
      theme: activeTheme, 
      themeMode, 
      isDark, 
      setThemeMode, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom hook to access the current Seevia theme and toggle logic.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
