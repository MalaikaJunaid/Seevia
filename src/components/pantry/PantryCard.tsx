import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';

// Seevia Core Imports
import { DARK_THEME as theme } from '@/theme/colors';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/theme';
import { PantryItem, PantryCategory } from '@/models/PantryItem';
import { expiryService } from '@/services/pantry/expiry.service';
import { hapticService } from '@/services/common/haptic.service';

interface PantryCardProps {
  item: PantryItem;
  onPress: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

// Map categories to local fallback images
const CATEGORY_IMAGES: Record<string, any> = {
  [PantryCategory.DAIRY]: require('../../assets/images/categories/dairy.png'),
  [PantryCategory.MEAT]: require('../../assets/images/categories/meat.png'),
  [PantryCategory.BAKERY]: require('../../assets/images/categories/bakery.png'),
  // Fallback for anything else
  'default': require('../../assets/images/categories/default.png'),
};

export function PantryCard({ item, onPress, onDelete, showActions = true }: PantryCardProps) {
  const expiryStatus = expiryService.checkExpiryStatus(item);

  const getStatusColor = () => {
    if (expiryStatus.isExpired) return theme.danger;
    if (expiryStatus.isExpiringSoon) return theme.primary; 
    if (item.quantity <= (item.lowStockThreshold || 0)) return theme.warning;
    return theme.success;
  };

  const getStatusIcon = () => {
    if (expiryStatus.isExpired) return 'alert-circle';
    if (expiryStatus.isExpiringSoon) return 'hourglass-outline';
    if (item.quantity <= (item.lowStockThreshold || 0)) return 'trending-down';
    return 'checkmark-circle';
  };

  const statusColor = getStatusColor();

  // Determine Image Source (DB URL or Local Fallback)
  const imageSource = item.imageUrl && item.imageUrl.trim() !== "" 
    ? { uri: item.imageUrl } 
    : (CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES['default']);

  return (
    <TouchableOpacity
      onPress={() => { hapticService.trigger('light'); onPress(); }}
      activeOpacity={0.7}
      accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}. ${expiryStatus.message || 'Fresh'}`}
      accessibilityRole="button"
      style={[
        styles.container,
        {
          // 🛠️ FIXED: Changed theme.card to theme.backgroundSecondary to prevent crashes
          backgroundColor: expiryStatus.isExpired ? `${theme.danger}15` : theme.backgroundSecondary,
          borderLeftColor: statusColor,
          // 🛠️ FIXED: Added safe fallback for borders
          borderColor: (theme as any).border || '#333333',
        },
        SHADOWS.sm,
      ]}
    >
      {/* Dynamic Image UI */}
      <Image 
        source={imageSource}
        style={styles.productImage}
        accessibilityIgnoresInvertColors={true}
      />

      <View style={styles.mainContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
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
      </View>

      {showActions && onDelete && (
        <TouchableOpacity
          onPress={() => { hapticService.trigger('medium'); onDelete(); }}
          style={styles.deleteButton}
          accessibilityLabel={`Remove ${item.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={24} color={theme.textTertiary || '#888888'} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', padding: SPACING.md, borderRadius: RADIUS.md,
    borderLeftWidth: 6, borderWidth: 1, marginBottom: SPACING.sm, alignItems: 'center',
  },
  productImage: {
    width: 50, height: 50, borderRadius: 8, marginRight: SPACING.md,
    backgroundColor: '#333', // Skeleton loading color
  },
  mainContent: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { ...TYPOGRAPHY.subheading, fontSize: 17, fontWeight: '700', flex: 1 },
  statusBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.sm },
  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detail: { ...TYPOGRAPHY.caption, fontSize: 13 },
  separator: { marginHorizontal: 8, color: '#666' },
  expiry: { ...TYPOGRAPHY.caption, fontWeight: '700', marginTop: 2 },
  deleteButton: { padding: SPACING.md, marginLeft: SPACING.sm },
});