import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { volunteerService, EnvironmentMapping } from '@/services/volunteer.service';
import { voiceManager } from '@/services/voice/voiceManager.service';
import { useAuth } from '@/hooks/useAuth';
import * as Location from 'expo-location';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0f2fe',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 8,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#e0f2fe',
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoTitle: {
    color: '#0c4a6e',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: '#0c4a6e',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  checklistItemActive: {
    backgroundColor: '#e0f2fe',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  mappingTypeOption: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  mappingTypeOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#f0f9ff',
  },
  mappingTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  coordinatesSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 12,
    color: '#666',
  },
  coordinateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default function EnvironmentMappingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [locationName, setLocationName] = useState('');
  const [mappingType, setMappingType] = useState<'layout' | 'products' | 'obstacles' | 'accessibility'>('layout');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Feature checklist
  const featureOptions = [
    { id: 'ramps', label: 'Wheelchair Accessible Ramps' },
    { id: 'elevators', label: 'Elevators / Lifts' },
    { id: 'parking', label: 'Accessible Parking' },
    { id: 'restrooms', label: 'Accessible Restrooms' },
    { id: 'seating', label: 'Seating Areas' },
    { id: 'directions', label: 'Clear Directions / Signage' },
  ];

  const handleGetLocation = async () => {
    try {
      setError('');
      await voiceManager.speak('Getting your location', 'en');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      await voiceManager.speak('Location captured', 'en');
    } catch (err: any) {
      setError('Failed to get location: ' + err.message);
      await voiceManager.speak('Failed to get location', 'en');
    }
  };

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!locationName.trim()) {
      setError('Location name is required');
      await voiceManager.speak('Please enter a location name', 'en');
      return;
    }

    if (!currentLocation) {
      setError('Location coordinates are required');
      await voiceManager.speak('Please capture your current location', 'en');
      return;
    }

    if (features.length === 0) {
      setError('Please select at least one feature');
      await voiceManager.speak('Please select features to map', 'en');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await voiceManager.speak('Submitting mapping data', 'en');

      const mapping = await volunteerService.submitMapping(
        user?.uid || '',
        currentLocation,
        locationName,
        mappingType,
        {
          description,
          features,
          timestamp: Date.now(),
          mappedBy: user?.email || 'unknown',
        }
      );

      setSuccess('Mapping submitted for review by administrators');
      await voiceManager.speak('Mapping submitted successfully', 'en');

      Alert.alert('Success', 'Thank you! Your mapping has been submitted for review.');

      // Reset form
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err: any) {
      setError('Failed to submit mapping: ' + err.message);
      await voiceManager.speak('Failed to submit mapping', 'en');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 16, color: '#666' }}>Submitting mapping...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Map Environment</Text>
        <Text style={styles.subtitle}>
          Help others by mapping locations and verifying accessibility features
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What is Environment Mapping?</Text>
          <Text style={styles.infoText}>
            You can help Seevia users by documenting accessibility features at locations you visit.
            All mappings are reviewed by administrators before being published.
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>{success}</Text>}

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>

          <Text style={styles.label}>Location Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., City Hospital Main Entrance"
            value={locationName}
            onChangeText={setLocationName}
            placeholderTextColor="#999"
            accessible
            accessibilityLabel="Location Name Input"
          />

          {currentLocation ? (
            <View style={styles.coordinatesSection}>
              <Text style={styles.coordinateLabel}>Captured Coordinates:</Text>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Latitude:</Text>
                <Text style={styles.coordinateValue}>{currentLocation.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.coordinateLabel}>Longitude:</Text>
                <Text style={styles.coordinateValue}>{currentLocation.longitude.toFixed(6)}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, { marginTop: 0, marginBottom: 16 }]}
              onPress={handleGetLocation}
              accessible
              accessibilityLabel="Capture Current Location"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Capture Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mapping Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mapping Type *</Text>

          {[
            { value: 'layout' as const, label: '📐 Layout', desc: 'Building layout' },
            { value: 'products' as const, label: '📦 Products', desc: 'Product data' },
            { value: 'obstacles' as const, label: '🚧 Obstacles', desc: 'Hazards' },
            { value: 'accessibility' as const, label: '♿ Accessibility', desc: 'Accessible features' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.mappingTypeOption,
                mappingType === option.value && styles.mappingTypeOptionActive,
              ]}
              onPress={() => setMappingType(option.value)}
              accessible
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: mappingType === option.value }}
            >
              <Text style={styles.mappingTypeText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Accessibility Features */}
        {mappingType === 'accessibility' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessibility Features *</Text>

            {featureOptions.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.checklistItem,
                  features.includes(feature.id) && styles.checklistItemActive,
                ]}
                onPress={() => toggleFeature(feature.id)}
                accessible
                accessibilityRole="checkbox"
                accessibilityState={{ checked: features.includes(feature.id) }}
                accessibilityLabel={feature.label}
              >
                <View
                  style={[
                    styles.checkbox,
                    features.includes(feature.id) && styles.checkboxActive,
                  ]}
                >
                  {features.includes(feature.id) && (
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                  )}
                </View>
                <Text style={styles.label}>{feature.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Additional Details</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Add any additional information or notes about this location..."
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor="#999"
            accessible
            accessibilityLabel="Additional Details Input"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessible
          accessibilityLabel="Submit Mapping"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Submit for Review</Text>
        </TouchableOpacity>

        {/* Info about review process */}
        <View
          style={{
            backgroundColor: '#f0fdf4',
            borderLeftWidth: 4,
            borderLeftColor: '#059669',
            padding: 12,
            borderRadius: 4,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              color: '#065f46',
              fontWeight: '600',
              marginBottom: 4,
            }}
          >
            Review Process
          </Text>
          <Text
            style={{
              color: '#065f46',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Your mapping will be reviewed by administrators within 24-48 hours. Once approved, it
            will be visible to other Seevia users.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}