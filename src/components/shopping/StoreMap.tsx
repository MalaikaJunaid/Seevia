import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/src/theme';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface AisleData {
  id: string;
  name: string;
  category: string;
  x: number; // Grid position
  y: number;
}

interface StoreMapProps {
  aisles: AisleData[];
  userLocation: { x: number; y: number };
  targetAisleId: string | null;
  onAislePress: (aisle: AisleData) => void;
}

/**
 * Simplified 2D Store Map for Seevia.
 * Converts complex Save Mart layouts into an accessible navigation grid.
 */
export function StoreMap({ aisles, userLocation, targetAisleId, onAislePress }: StoreMapProps) {
  
  const handleAislePress = (aisle: AisleData) => {
    HapticFeedback.lightTap();
    onAislePress(aisle);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <ScrollView contentContainerStyle={styles.mapGrid} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridWrapper}>
          {/* Legend / Entrance */}
          <View style={[styles.entrance, { backgroundColor: theme.cardBorder }]}>
            <Text style={[styles.entranceText, { color: theme.textTertiary }]}>ENTRANCE</Text>
          </View>

          {/* Render Aisles as high-contrast blocks */}
          {aisles.map((aisle) => {
            const isTarget = aisle.id === targetAisleId;
            return (
              <TouchableOpacity
                key={aisle.id}
                onPress={() => handleAislePress(aisle)}
                style={[
                  styles.aisleBlock,
                  {
                    left: aisle.x * 60,
                    top: aisle.y * 100,
                    backgroundColor: isTarget ? theme.primary : theme.card,
                    borderColor: isTarget ? '#fff' : theme.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Aisle ${aisle.id}: ${aisle.category}`}
              >
                <Text style={[styles.aisleLabel, { color: isTarget ? '#fff' : theme.textSecondary }]}>
                  {aisle.id}
                </Text>
                {isTarget && <Ionicons name="location" size={16} color="#fff" />}
              </TouchableOpacity>
            );
          })}

          {/* User Location Pulse */}
          <View 
            style={[
              styles.userDot, 
              { 
                left: userLocation.x * 60 + 20, 
                top: userLocation.y * 100 + 40,
                backgroundColor: theme.success 
              }
            ]} 
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.success }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Target</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    height: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mapGrid: {
    padding: SPACING.xl,
  },
  gridWrapper: {
    width: 600,
    height: 350,
    position: 'relative',
  },
  entrance: {
    position: 'absolute',
    bottom: 0,
    left: '40%',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  entranceText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  aisleBlock: {
    position: 'absolute',
    width: 40,
    height: 80,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  aisleLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  userDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.lg,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
});
