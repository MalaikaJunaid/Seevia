import React from 'react';
import {
    GestureResponderEvent,
    Image,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Seevia Theme Integration
import { DARK_THEME as theme } from '../../theme/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

export interface ProductCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  imageUri?: string;
  price?: string | number;
  isAllergic?: boolean; // New: Module 3 Allergy integration
  onPress?: (e?: GestureResponderEvent) => void;
  onAdd?: (e?: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function ProductCard({
  id,
  title,
  subtitle,
  imageUri,
  price,
  isAllergic = false,
  onPress,
  onAdd,
  style,
  testID,
}: ProductCardProps) {
  
  const renderImage = () => {
    if (imageUri) {
      return <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />;
    }
    
    // Accessibility: Dynamic initials for unknown product images
    const initials = title
      .split(' ')
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={[styles.placeholder, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>{initials}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle || ''}`}
      accessibilityHint={isAllergic ? "Warning: Contains registered allergens." : "Opens product details"}
    >
      {renderImage()}
      
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          {isAllergic && (
            <Ionicons name="warning" size={20} color={theme.danger} style={styles.warningIcon} />
          )}
        </View>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.row}>
          {typeof price !== 'undefined' ? (
            <Text style={[styles.price, { color: theme.primary }]}>
              {typeof price === 'number' ? `PKR ${price}` : price}
            </Text>
          ) : <View />}
          
          {onAdd ? (
            <TouchableOpacity 
              testID={`${id ?? title}-add`} 
              onPress={onAdd} 
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              accessibilityLabel={`Add ${title} to pantry`}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addText}>Pantry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    marginVertical: SPACING.xs,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.sm,
    backgroundColor: '#333',
  },
  placeholder: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontWeight: '700',
    fontSize: 20,
  },
  meta: {
    marginLeft: SPACING.md,
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700',
    flex: 1,
  },
  warningIcon: {
    marginLeft: SPACING.xs,
  },
  subtitle: { fontSize: 13, marginTop: 2 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: SPACING.sm 
  },
  price: { fontWeight: '800', fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    gap: 4,
  },
  addText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 12,
  },
});
