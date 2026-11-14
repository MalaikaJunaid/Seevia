import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { HandshakeService, LinkingStatus } from '@/services/firebase/handshake.service';
import { voiceService } from '@/services/voice/voiceService';
import { DARK_THEME as theme } from '@/theme/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusBadgeLinked: {
    backgroundColor: '#10b981',
  },
  statusBadgeUnlinked: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ef4444',
    marginTop: 8,
  },
  codeDisplay: {
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
});

/**
 * Handshake Flow Component
 * Demonstrates the complete caregiver-PWD linking flow
 */
export function HandshakeFlow() {
  const { user, userProfile } = useAuth();
  const [linkingStatus, setLinkingStatus] = useState<LinkingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    loadLinkingStatus();

    // Set up real-time listener for status changes
    const unsubscribe = HandshakeService.onHandshakeStatusChanged(
      user?.uid || '',
      (status) => {
        setLinkingStatus(status);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const loadLinkingStatus = async () => {
    if (!user?.uid) return;

    try {
      const status = await HandshakeService.getLinkingStatus(user.uid);
      setLinkingStatus(status);
    } catch (error) {
      console.error('Error loading linking status:', error);
    }
  };

  const createInvitation = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      const result = await HandshakeService.createInvitation(user.uid);
      setGeneratedCode(result.invitationCode);
      setExpiresAt(result.expiresAt);

      // Trigger voice announcement
      const language = userProfile?.language === 'ur' ? 'ur' : 'en';
      const announcement = HandshakeService.getHandshakeAnnouncement(
        'invitation_created',
        language
      );
      await voiceService.speak(announcement, { language: language === 'ur' ? 'ur-PK' : 'en-US' });

      Alert.alert(
        'Invitation Created',
        `Share this code with your caregiver: ${result.invitationCode}`,
        [
          { text: 'OK' },
          { text: 'Copy', onPress: () => copyToClipboard(result.invitationCode) },
        ]
      );
    } catch (error) {
      console.error('Error creating invitation:', error);
      Alert.alert('Error', 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user?.uid || !invitationCode) {
      Alert.alert('Error', 'Please enter an invitation code');
      return;
    }

    try {
      setLoading(true);

      const result = await HandshakeService.acceptInvitation(user.uid, invitationCode);

      if (result.success) {
        // Trigger voice announcement
        const language = userProfile?.language === 'ur' ? 'ur' : 'en';
        const announcement = HandshakeService.getHandshakeAnnouncement(
          'invitation_accepted',
          language
        );
        await voiceService.speak(announcement, { language: language === 'ur' ? 'ur-PK' : 'en-US' });

        Alert.alert('Success', 'You are now connected to your PWD');
        setInvitationCode('');
        await loadLinkingStatus();
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  const revokeLink = async () => {
    if (!linkingStatus?.trustCircle) return;

    Alert.alert(
      'Revoke Connection',
      'Are you sure you want to revoke this connection? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const result = await HandshakeService.revokeLink(
                linkingStatus.trustCircle.circleId,
                user?.uid || ''
              );

              if (result.success) {
                // Trigger voice announcement
                const language = userProfile?.language === 'ur' ? 'ur' : 'en';
                const announcement = HandshakeService.getHandshakeAnnouncement(
                  'link_revoked',
                  language
                );
                await voiceService.speak(announcement, {
                  language: language === 'ur' ? 'ur-PK' : 'en-US',
                });

                Alert.alert('Success', 'Connection has been revoked');
                await loadLinkingStatus();
              } else {
                Alert.alert('Error', result.error || 'Failed to revoke connection');
              }
            } catch (error) {
              console.error('Error revoking link:', error);
              Alert.alert('Error', 'Failed to revoke connection');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = (code: string) => {
    // Implement clipboard copy
    console.log('Copied to clipboard:', code);
  };

  const isPWD = userProfile?.role === 'pwd';
  const isCaregiver = userProfile?.role === 'caregiver';

  if (!user || !userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Please sign in to continue</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {isPWD ? 'Connect with Caregiver' : 'Connect with PWD'}
      </Text>
      <Text style={styles.subtitle}>
        {isPWD
          ? 'Create an invitation code to share with your caregiver'
          : 'Enter the invitation code from your PWD to connect'}
      </Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>

        {linkingStatus?.isLinked ? (
          <>
            <View style={[styles.statusBadge, styles.statusBadgeLinked]}>
              <Text style={styles.statusText}>Connected</Text>
            </View>

            {isPWD && linkingStatus.caregiverProfile && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Caregiver:</Text>
                  <Text style={styles.infoValue}>
                    {linkingStatus.caregiverProfile.fullName}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>
                    {linkingStatus.caregiverProfile.email}
                  </Text>
                </View>
              </>
            )}

            {isCaregiver && linkingStatus.pwdProfile && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>PWD:</Text>
                  <Text style={styles.infoValue}>
                    {linkingStatus.pwdProfile.fullName}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>
                    {linkingStatus.pwdProfile.email}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={revokeLink}
            >
              <Text style={styles.buttonText}>Revoke Connection</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.statusBadge, styles.statusBadgeUnlinked]}>
              <Text style={styles.statusText}>Not Connected</Text>
            </View>
            <Text style={styles.emptyStateText}>
              {isPWD
                ? 'Create an invitation to connect with a caregiver'
                : 'Enter an invitation code to connect with a PWD'}
            </Text>
          </>
        )}
      </View>

      {/* PWD: Create Invitation */}
      {isPWD && !linkingStatus?.isLinked && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Invitation</Text>

          {generatedCode ? (
            <>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>{generatedCode}</Text>
                <Text style={styles.codeLabel}>
                  Expires: {expiresAt?.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => copyToClipboard(generatedCode)}
              >
                <Text style={styles.buttonText}>Copy Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.button} onPress={createInvitation}>
              <Text style={styles.buttonText}>Generate Invitation Code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Caregiver: Accept Invitation */}
      {isCaregiver && !linkingStatus?.isLinked && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accept Invitation</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={invitationCode}
            onChangeText={setInvitationCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity style={styles.button} onPress={acceptInvitation}>
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}