import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Services & UI Components
import { colors } from '@/src/constants/colors';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { AuthService } from '@/src/services/firebase/auth.service';
import { TextToSpeechService } from '@/src/services/voice/textToSpeech.service';
import { hapticService } from '@/src/services/common/haptic.service';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    TextToSpeechService.speak("Login screen. Double tap to enter credentials.");
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      TextToSpeechService.speak("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await AuthService.signIn(email, password);
      await hapticService.trigger('success');
      await TextToSpeechService.speak("Login successful. Welcome to Seevia.");
      router.replace('/(tabs)/home');
    } catch (error: any) {
      TextToSpeechService.speak("Login failed. Please check your credentials.");
      hapticService.trigger('warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Seevia</Text>
          <Text style={styles.subtitle}>Sign in to access your Trust Circle</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Button 
          title={loading ? "Verifying..." : "Login"} 
          onPress={handleLogin}
          disabled={loading}
          style={styles.loginBtn}
        />

        <TouchableOpacity 
          style={styles.forgotBtn}
          onPress={() => hapticService.selection()}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 30, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 48, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
  form: { gap: 20, marginBottom: 30 },
  loginBtn: { width: '100%', paddingVertical: 15 },
  forgotBtn: { marginTop: 20, alignItems: 'center' },
  forgotText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});

export default LoginScreen;
