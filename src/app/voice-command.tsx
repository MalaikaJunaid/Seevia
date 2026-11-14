import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '@/hooks/useAccessibility';
import { deepgramSTTService } from '@/services/voice/deepgramSTT.service';
import { aiFallbackService } from '@/services/ai/aiFallback.service';
import { romanUrduTTSService } from '@/services/voice/romanUrduTTS.service';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING } from '@/theme';
import { logger } from '@/utils/logger';
import { VoiceCommandIntent } from '@/models';

const { width } = Dimensions.get('window');

interface VoiceFeedback {
  text: string;
  isPartial: boolean;
  confidence: number;
}

export default function VoiceCommandScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { triggerHapticFeedback, directionalHaptic } = useAccessibility();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<VoiceFeedback | null>(null);
  const [intent, setIntent] = useState<{ intent: string; entities: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pulseAnim = useState(new Animated.Value(1))[0];
  const waveAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Welcome message
    romanUrduTTSService.speak('Voice command mode. Aap kya kehna chahte hain?', { language: 'ur' });

    return () => {
      deepgramSTTService.cancel();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      // Wave animation
      Animated.loop(
        Animated.timing(waveAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      setIntent(null);
      setIsListening(true);

      await triggerHapticFeedback('light');

      // Start listening
      const result = await deepgramSTTService.listenForCommand(5000);

      if (result.success && result.text) {
        setTranscript({
          text: result.text,
          isPartial: false,
          confidence: result.confidence,
        });

        // Process intent
        await processIntent(result.text);
      } else {
        setError(result.error || 'Could not understand. Please try again.');
        await romanUrduTTSService.speak('Samajh nahi aya. Dobara koshish karein.', { language: 'ur' });
      }

      setIsListening(false);
    } catch (err) {
      logger.error('VOICE_COMMAND', 'Listening failed', err);
      setError('Voice recognition failed. Please try again.');
      setIsListening(false);

      // Fallback to device speech recognition
      await romanUrduTTSService.speak('Masla ho gaya. Dobara koshish karein.', { language: 'ur' });
    }
  }, [triggerHapticFeedback]);

  const processIntent = useCallback(async (text: string) => {
    try {
      setIsProcessing(true);

      // Use AI fallback system to classify intent
      const result = await aiFallbackService.classifyIntent(text, 'ur');

      if (result.success && result.data) {
        setIntent(result.data);

        // Execute the intent
        await executeIntent(result.data.intent, result.data.entities);
      } else {
        setError('Could not understand command.');
        await romanUrduTTSService.speak('Command samajh nahi aya.', { language: 'ur' });
      }

      setIsProcessing(false);
    } catch (err) {
      logger.error('VOICE_COMMAND', 'Intent processing failed', err);
      setError('Processing failed.');
      setIsProcessing(false);
    }
  }, []);

  const executeIntent = useCallback(async (intentName: string, entities: Record<string, string>) => {
    await triggerHapticFeedback('success');

    switch (intentName) {
      case VoiceCommandIntent.NAVIGATE_HOME:
        await romanUrduTTSService.speak('Dashboard par le ja raha hoon.', { language: 'ur' });
        router.replace('/(tabs)/home');
        break;

      case VoiceCommandIntent.NAVIGATE_PANTRY:
        await romanUrduTTSService.speak('Kitchen list khol raha hoon.', { language: 'ur' });
        router.replace('/(tabs)/pantry');
        break;

      case VoiceCommandIntent.NAVIGATE_EMERGENCY:
        await romanUrduTTSService.speak('Emergency screen khol raha hoon.', { language: 'ur' });
        router.replace('/(tabs)/emergency');
        break;

      case VoiceCommandIntent.NAVIGATE_SHOPPING:
        await romanUrduTTSService.speak('Shopping list khol raha hoon.', { language: 'ur' });
        router.replace('/(tabs)/shopping');
        break;

      case VoiceCommandIntent.IDENTIFY_PRODUCT:
        await romanUrduTTSService.speak('Camera khol raha hoon. Samne jo hai batata hoon.', { language: 'ur' });
        router.push('/scanner');
        break;

      case VoiceCommandIntent.READ_TEXT:
        await romanUrduTTSService.speak('Camera khol raha hoon. Text padhta hoon.', { language: 'ur' });
        router.push('/scanner');
        break;

      case VoiceCommandIntent.ADD_ITEM:
        const itemName = entities.itemName || 'Item';
        await romanUrduTTSService.speak(`${itemName} add kar raha hoon.`, { language: 'ur' });
        router.push({ pathname: '/add-item', params: { name: itemName } });
        break;

      case VoiceCommandIntent.ACTIVATE_SOS:
        await romanUrduTTSService.speak('Emergency! Madad bheji ja rahi hai.', { language: 'ur' });
        router.replace('/(tabs)/emergency');
        break;

      case VoiceCommandIntent.DESCRIBE_SCENE:
        await romanUrduTTSService.speak('Camera khol raha hoon. Mahaul batata hoon.', { language: 'ur' });
        router.push('/scanner');
        break;

      default:
        await romanUrduTTSService.speak(`Command: ${intentName}. Lekin ye feature abhi available nahi hai.`, { language: 'ur' });
    }
  }, [triggerHapticFeedback, router]);

  const handleQuickCommand = useCallback(async (command: string, intentName: string) => {
    setTranscript({ text: command, isPartial: false, confidence: 1 });
    await executeIntent(intentName, {});
  }, [executeIntent]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Command</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Awaaz ka command dein
        </Text>
      </View>

      {/* Voice Input Area */}
      <View style={styles.voiceArea}>
        <Animated.View style={[
          styles.micCircle,
          {
            backgroundColor: isListening ? theme.primary : theme.card,
            transform: [{ scale: pulseAnim }],
          },
        ]}>
          <TouchableOpacity
            onPress={startListening}
            disabled={isListening || isProcessing}
            style={styles.micButton}
            accessibilityLabel={isListening ? 'Listening...' : 'Tap to speak'}
            accessibilityHint="Tap to start voice command"
          >
            <Ionicons
              name={isListening ? 'radio-button-on' : 'mic'}
              size={48}
              color="#FFF"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Status Text */}
        {isListening && (
          <Text style={[styles.statusText, { color: theme.primary }]}>
            Listening... Awaaz sun raha hoon
          </Text>
        )}

        {isProcessing && (
          <Text style={[styles.statusText, { color: theme.warning }]}>
            Processing... Soch raha hoon
          </Text>
        )}

        {/* Transcript Display */}
        {transcript && (
          <View style={[styles.transcriptCard, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <Text style={[styles.transcriptLabel, { color: theme.textSecondary }]}>
              You said:
            </Text>
            <Text style={[styles.transcriptText, { color: theme.text }]}>
              {transcript.text}
            </Text>
            {transcript.confidence < 0.8 && (
              <Text style={[styles.confidenceText, { color: theme.warning }]}>
                Confidence: {(transcript.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        )}

        {/* Intent Display */}
        {intent && (
          <View style={[styles.intentCard, { backgroundColor: theme.success }]}>
            <Text style={styles.intentText}>
              Intent: {intent.intent}
            </Text>
            {Object.keys(intent.entities).length > 0 && (
              <Text style={styles.entityText}>
                {JSON.stringify(intent.entities)}
              </Text>
            )}
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: theme.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Quick Commands */}
      <View style={styles.quickCommandsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Commands</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Jaldi ke commands
        </Text>

        <View style={styles.quickCommandsGrid}>
          {[
            { command: 'Scan Product', urdu: 'Scan karein', intent: VoiceCommandIntent.IDENTIFY_PRODUCT },
            { command: 'Open Pantry', urdu: 'Kitchen', intent: VoiceCommandIntent.NAVIGATE_PANTRY },
            { command: 'Emergency', urdu: 'Madad', intent: VoiceCommandIntent.ACTIVATE_SOS },
            { command: 'Home', urdu: 'Dashboard', intent: VoiceCommandIntent.NAVIGATE_HOME },
          ].map((item) => (
            <TouchableOpacity
              key={item.intent}
              style={[styles.quickCommandButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => handleQuickCommand(item.command, item.intent)}
              accessibilityLabel={item.command}
            >
              <Text style={[styles.quickCommandText, { color: theme.text }]}>{item.command}</Text>
              <Text style={[styles.quickCommandUrdu, { color: theme.textSecondary }]}>{item.urdu}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sample Commands */}
      <View style={styles.sampleCommands}>
        <Text style={[styles.sampleTitle, { color: theme.textTertiary }]}>
          Example Commands:
        </Text>
        <Text style={[styles.sampleText, { color: theme.textSecondary }]}>
          "Yeh kya hai?" {"\n"}
          "Pantry kholo" {"\n"}
          "Cheeni kitni reh gayi?" {"\n"}
          "Madad chahiye"
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  voiceArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  micButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.lg,
  },
  transcriptCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 350,
  },
  transcriptLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 18,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 12,
    marginTop: 8,
  },
  intentCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  intentText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  entityText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  errorCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  errorText: {
    color: '#FFF',
    fontWeight: '600',
  },
  quickCommandsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  quickCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickCommandButton: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: (width - SPACING.lg * 3) / 2,
  },
  quickCommandText: {
    fontWeight: '700',
    fontSize: 14,
  },
  quickCommandUrdu: {
    fontSize: 12,
    marginTop: 2,
  },
  sampleCommands: {
    padding: SPACING.lg,
    marginTop: 'auto',
  },
  sampleTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  sampleText: {
    fontSize: 14,
    lineHeight: 22,
  },
});