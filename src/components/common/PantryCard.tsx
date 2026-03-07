import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/src/theme/colors';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/src/theme';
import { PantryItem } from '@/src/models/PantryItem';
import { ExpiryService } from '@/src/services/pantry/expiry.service';
import HapticFeedback from '@/src/services/shopping/HapticFeedback';

interface PantryCardProps {
  item: PantryItem;
  onPress: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

/**
 * Smart Pantry Card for Seevia.
 * Features AI-driven status indicators and high-contrast accessibility.
 */
export function PantryCard({
  item,
  onPress,
  onDelete,
  showActions = true,
}: PantryCardProps) {
  const expiryStatus = ExpiryService.checkExpiryStatus(item);

  // Map AI Logic to Seevia Branding
  const getStatusColor = () => {
    if (expiryStatus.isExpired) return theme.danger;
    if (expiryStatus.isExpiringSoon) return theme.primary; // Warning is Seevia Orange
    if (item.quantity <= (item.lowStockThreshold || 0)) return theme.primary;
    return theme.success;
  };

  const getStatusIcon = () => {
    if (expiryStatus.isExpired) return 'alert-circle';
    if (expiryStatus.isExpiringSoon) return 'hourglass-outline';
    if (item.quantity <= (item.lowStockThreshold || 0)) return 'trending-down';
    return 'checkmark-circle';
  };

  const handlePress = () => {
    HapticFeedback.lightTap();
    onPress();
  };

  const handleDelete = () => {
    HapticFeedback.mediumTap();
    onDelete?.();
  };

  const statusColor = getStatusColor();

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit || ''}, ${expiryStatus.message}`}
      accessibilityRole="button"
      style={[
        styles.container,
        {
          backgroundColor: expiryStatus.isExpired || expiryStatus.isExpiringSoon
            ? `${statusColor}10` // Subtle tinted background for priority items
            : theme.card,
          borderLeftColor: statusColor,
          borderColor: theme.cardBorder,
        },
        SHADOWS.sm,
      ]}
    >
      <View style={styles.mainContent}>
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.name,
              { color: expiryStatus.isExpired ? theme.danger : theme.text },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={getStatusIcon()} size={14} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={[styles.detail, { color: theme.textSecondary }]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={[styles.detail, { color: theme.textSecondary }]}>
            {item.category}
          </Text>
        </View>

        {(item.expiryDate || expiryStatus.message) && (
          <Text style={[styles.expiry, { color: statusColor }]}>
            {expiryStatus.message}
          </Text>
        )}

        {item.price && (
          <Text style={[styles.price, { color: theme.primary }]}>
            Rs. {item.price}
          </Text>
        )}
      </View>

      {showActions && onDelete && (
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteButton}
          accessibilityLabel={`Remove ${item.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...TYPOGRAPHY.subheading,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detail: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
  },
  separator: {
    marginHorizontal: 8,
    color: '#666',
  },
  expiry: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  price: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    marginTop: 4,
  },
  deleteButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
});
