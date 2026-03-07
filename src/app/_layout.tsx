import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

// Import your custom theme
import { DARK_THEME, LIGHT_THEME } from '../src/theme/colors';

export const unstable_settings = {
  // Ensure onboarding is considered in the initial route logic
  initialRouteName: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Create a navigation theme that matches your Seevia Branding
  const CustomNavigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: DARK_THEME.primary,
      background: colorScheme === 'dark' ? DARK_THEME.background : LIGHT_THEME.background,
      card: colorScheme === 'dark' ? DARK_THEME.card : LIGHT_THEME.card,
      text: colorScheme === 'dark' ? DARK_THEME.text : LIGHT_THEME.text,
      border: colorScheme === 'dark' ? DARK_THEME.cardBorder : LIGHT_THEME.cardBorder,
    },
  };

  return (
    <ThemeProvider value={CustomNavigationTheme}>
      <Stack screenOptions={{ 
        headerShown: false,
        animation: 'fade_from_bottom' 
      }}>
        {/* Module 1: Entry Point */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        
        {/* Main App Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Module 4: Shopping/Vision Modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Seevia Vision' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
