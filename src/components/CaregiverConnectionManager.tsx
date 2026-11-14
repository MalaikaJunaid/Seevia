/**
 * Caregiver Connection Manager Component
 * Displayed in PWD settings to generate/manage caregiver invitations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME as theme } from '@/theme/colors';
import { SPACING, TYPOGRAPHY } from '@/theme';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { PWDConnectionService, CaregiverPWDConnection } from '@/services/firebase/pwdConnection.service';
import { AuthService } from '@/services/firebase/auth.service';
import { hapticService } from '@/services/common/haptic.service';
// @ts-ignore
import TtsService from '@/services/voice/TtsService';

export const CaregiverConnectionManager = () => {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CaregiverPWDConnection[]>([]);
  const [activeConnections, setActiveConnections] = useState<CaregiverPWDConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      setIsLoading(true);
      const requests = await PWDConnectionService.getPWDPendingRequests(user.uid);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      const user_doc = await AuthService.getUserProfile(user.uid);
      const userName = user_doc?.fullName || 'User';

      TtsService.speak("Generating invitation code...");
      const code = await PWDConnectionService.createInvitationCode(user.uid, userName);
      
      setGeneratedCode(code);
      // Code expires in 24 hours
      setCodeExpiry(new Date(Date.now() + 24 * 60 * 60 * 1000));
      
      hapticService.trigger('success');
      TtsService.speak(`Invitation code generated: ${code.split('').join(' ')}`);
      Alert.alert(
        'Code Generated',
        `Your invitation code is: ${code}\n\nShare this with your caregiver. It expires in 24 hours.`
      );
    } catch (error) {
      console.error('Error generating code:', error);
      TtsService.speak('Failed to generate invitation code');
      Alert.alert('Error', 'Failed to generate invitation code');
    }
  };

  const handleApproveCaregiver = async (caregiver_uid: string) => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      TtsService.speak("Approving caregiver connection...");
      await PWDConnectionService.approveCaregiverConnection(user.uid, caregiver_uid);
      
      hapticService.trigger('success');
      TtsService.speak("Caregiver approved");
      loadConnections();
      Alert.alert('Success', 'Caregiver connection approved');
    } catch (error) {
      console.error('Error approving caregiver:', error);
      TtsService.speak('Failed to approve caregiver');
    }
  };

  const handleRejectCaregiver = async (caregiver_uid: string) => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;

      TtsService.speak("Rejecting caregiver connection...");
      await PWDConnectionService.rejectCaregiverConnection(user.uid, caregiver_uid);
      
      hapticService.trigger('warning');
      TtsService.speak("Caregiver connection rejected");
      loadConnections();
    } catch (error) {
      console.error('Error rejecting caregiver:', error);
      TtsService.speak('Failed to reject caregiver');
    }
  };

  const copyCodeToClipboard = (code: string) => {
    // Note: In real app, use react-native-clipboard
    Alert.alert('Copy Code', `Code copied: ${code}`);
    TtsService.speak(`Code ${code} copied`);
  };

  return (
    <View style={styles.container}>
      {/* Generate New Invitation Code */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Invite a Caregiver
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Generate a temporary invitation code to share with your caregiver.
        </Text>

        {generatedCode ? (
          <View style={[styles.codeBox, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
              Your invitation code:
            </Text>
            <Text style={[styles.codeValue, { color: theme.primary }]}>
              {generatedCode}
            </Text>
            <Text style={[styles.codeExpiry, { color: theme.textTertiary }]}>
              Expires: {codeExpiry?.toLocaleTimeString()}
            </Text>
            <TouchableOpacity
              onPress={() => copyCodeToClipboard(generatedCode)}
              style={[styles.copyButton, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="copy" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600', marginLeft: 8 }}>
                Copy Code
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title="Generate Invitation Code"
            onPress={handleGenerateCode}
            icon={<Ionicons name="key-outline" size={20} color="#FFF" />}
            disabled={isLoading}
          />
        )}
      </Card>

      {/* Pending Caregiver Requests */}
      {pendingRequests.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Pending Requests
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Caregivers requesting access to your account.
          </Text>

          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.caregiver_uid}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.requestCard, { borderColor: theme.cardBorder }]}>
                <View style={styles.requestHeader}>
                  <Ionicons name="person-circle" size={40} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={[styles.caregiverName, { color: theme.text }]}>
                      {item.caregiver_name}
                    </Text>
                    <Text style={[styles.requestDate, { color: theme.textSecondary }]}>
                      Requested {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestActions}>
                  <Button
                    title="Approve"
                    onPress={() => handleApproveCaregiver(item.caregiver_uid)}
                    variant="success"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Reject"
                    onPress={() => handleRejectCaregiver(item.caregiver_uid)}
                    variant="danger"
                    style={{ flex: 1, marginLeft: SPACING.md }}
                  />
                </View>
              </View>
            )}
          />
        </Card>
      )}

      {isLoading && <ActivityIndicator size="large" color={theme.primary} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.heading, marginBottom: SPACING.md },
  sectionDescription: { ...TYPOGRAPHY.body, marginBottom: SPACING.lg },
  codeBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  codeLabel: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm },
  codeValue: { ...TYPOGRAPHY.display, fontSize: 24, fontWeight: '800', marginBottom: SPACING.md, letterSpacing: 4 },
  codeExpiry: { ...TYPOGRAPHY.caption, marginBottom: SPACING.lg },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  caregiverName: { ...TYPOGRAPHY.subheading, fontWeight: '700' },
  requestDate: { ...TYPOGRAPHY.caption, marginTop: SPACING.xs },
  requestActions: { flexDirection: 'row', gap: SPACING.md },
});
