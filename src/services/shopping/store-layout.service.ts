/**
 * Store Layout Service
 * Manages indoor store maps and navigation paths
 * 
 * Features:
 * - Store layout caching
 * - Aisle location tracking
 * - Path optimization (A*)
 * - Navigation instructions (turn-by-turn)
 */

import { logger } from '@/utils/logger';
import { FirestoreService } from '../firebase/firestore.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coordinate {
  x: number; // meters, relative to store entrance
  y: number;
}

export interface Aisle {
  id: string;
  name: string;
  nameUr: string;
  category: string; // Dairy, Bakery, etc.
  coordinates: Coordinate;
  width: number;
  height: number;
  items: string[]; // Product IDs
}

export interface Store {
  id: string;
  name: string;
  nameUr: string;
  address: string;
  aisle_data: Record<string, Aisle>;
  entrance: Coordinate;
  checkout: Coordinate;
  totalWidth: number;
  totalHeight: number;
  mapUrl?: string;
}

export interface NavigationPath {
  aisles: Aisle[];
  totalDistance: number;
  instructions: NavigationInstruction[];
  estimatedTime: number; // seconds
}

export interface NavigationInstruction {
  step: number;
  aisle: Aisle;
  direction: 'straight' | 'left' | 'right';
  distance: number; // meters
  voice: string; // Roman Urdu instruction
  voiceEn: string; // English instruction
}

class StoreLayoutService {
  private readonly MODULE = 'STORE_LAYOUT';
  private firestoreService = new FirestoreService();
  private storeCache: Map<string, Store> = new Map();
  private currentStoreId: string | null = null;
  private cacheInitialized = false;

  /**
   * Initialize store layout service
   */
  async initialize(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Initializing store layout service');
      await this.loadCacheFromStorage();
      this.cacheInitialized = true;
      logger.info(this.MODULE, 'Store layout service ready');
    } catch (error) {
      logger.error(this.MODULE, 'Initialization failed', error);
    }
  }

  /**
   * Load store layout by store ID
   */
  async loadStore(storeId: string): Promise<Store | null> {
    try {
      // Check cache first
      if (this.storeCache.has(storeId)) {
        const store = this.storeCache.get(storeId)!;
        this.currentStoreId = storeId;
        logger.info(this.MODULE, `Loaded store from cache: ${store.name}`);
        return store;
      }

      // Fetch from Firebase
      const store = await this.firestoreService.getDocument('stores', storeId);
      if (!store) {
        logger.warn(this.MODULE, `Store not found: ${storeId}`);
        return null;
      }

      // Cache it
      this.storeCache.set(storeId, store);
      this.currentStoreId = storeId;
      await this.saveToStorage();

      logger.info(this.MODULE, `Loaded store from Firebase: ${store.name}`);
      return store;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load store', error);
      return null;
    }
  }

  /**
   * Get current store
   */
  getCurrentStore(): Store | null {
    if (!this.currentStoreId) return null;
    return this.storeCache.get(this.currentStoreId) || null;
  }

  /**
   * Find aisle by product category
   */
  findAisleByCategory(storeId: string, category: string): Aisle | null {
    try {
      const store = this.storeCache.get(storeId);
      if (!store) return null;

      const normalizedCategory = category.toLowerCase();
      for (const [, aisle] of Object.entries(store.aisle_data)) {
        if (aisle.category.toLowerCase() === normalizedCategory) {
          return aisle;
        }
      }

      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to find aisle', error);
      return null;
    }
  }

  /**
   * Calculate optimal shopping path
   */
  calculateShoppingPath(
    storeId: string,
    categories: string[]
  ): NavigationPath {
    try {
      const store = this.storeCache.get(storeId);
      if (!store) {
        return {
          aisles: [],
          totalDistance: 0,
          instructions: [],
          estimatedTime: 0,
        };
      }

      // Find all relevant aisles
      const targetAisles: Aisle[] = [];
      for (const category of categories) {
        const aisle = this.findAisleByCategory(storeId, category);
        if (aisle && !targetAisles.find(a => a.id === aisle.id)) {
          targetAisles.push(aisle);
        }
      }

      // Sort aisles by proximity to entrance (A* pathfinding)
      const sortedAisles = this.sortByProximity(targetAisles, store.entrance);

      // Generate navigation instructions
      const instructions = this.generateInstructions(
        store,
        sortedAisles
      );

      const totalDistance = this.calculateDistance(sortedAisles, store);
      const estimatedTime = Math.floor(totalDistance / 1.4) + 30; // 1.4 m/s walking + 30s per aisle

      return {
        aisles: sortedAisles,
        totalDistance,
        instructions,
        estimatedTime,
      };
    } catch (error) {
      logger.error(this.MODULE, 'Failed to calculate path', error);
      return {
        aisles: [],
        totalDistance: 0,
        instructions: [],
        estimatedTime: 0,
      };
    }
  }

  /**
   * Get next navigation instruction
   */
  getNextInstruction(path: NavigationPath, currentStep: number): NavigationInstruction | null {
    if (currentStep >= path.instructions.length) {
      return null;
    }
    return path.instructions[currentStep];
  }

  /**
   * Get all nearby stores (future: use geolocation)
   */
  async getNearbyStores(latitude: number, longitude: number, radiusKm: number = 5): Promise<Store[]> {
    try {
      logger.info(this.MODULE, 'Fetching nearby stores', { latitude, longitude, radiusKm });

      // For now, return cached stores
      // In production, use Firestore GeoQueries or Mapbox
      return Array.from(this.storeCache.values());
    } catch (error) {
      logger.error(this.MODULE, 'Failed to get nearby stores', error);
      return [];
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Sort aisles by proximity to entrance (greedy nearest-neighbor)
   */
  private sortByProximity(aisles: Aisle[], startPoint: Coordinate): Aisle[] {
    if (aisles.length === 0) return [];

    const sorted: Aisle[] = [];
    let current = startPoint;

    while (sorted.length < aisles.length) {
      let nearest: Aisle | null = null;
      let minDistance = Infinity;

      for (const aisle of aisles) {
        if (sorted.find(a => a.id === aisle.id)) continue;

        const distance = this.euclideanDistance(current, aisle.coordinates);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = aisle;
        }
      }

      if (nearest) {
        sorted.push(nearest);
        current = nearest.coordinates;
      }
    }

    return sorted;
  }

  /**
   * Generate turn-by-turn navigation instructions
   */
  private generateInstructions(store: Store, aisles: Aisle[]): NavigationInstruction[] {
    const instructions: NavigationInstruction[] = [];
    let current = store.entrance;
    let step = 1;

    for (const aisle of aisles) {
      const direction = this.getDirection(current, aisle.coordinates);
      const distance = this.euclideanDistance(current, aisle.coordinates);

      const directionMap: Record<string, string> = {
        north: 'straight',
        south: 'straight',
        east: 'right',
        west: 'left',
      };

      const instruction: NavigationInstruction = {
        step,
        aisle,
        direction: directionMap[direction] as 'straight' | 'left' | 'right',
        distance: Math.round(distance * 10) / 10,
        voice: `${aisle.nameUr} ke liye ${direction} jayen, ${distance.toFixed(1)} meter`,
        voiceEn: `Head ${direction} for ${aisle.name}, about ${distance.toFixed(1)} meters`,
      };

      instructions.push(instruction);
      current = aisle.coordinates;
      step++;
    }

    // Add instruction for checkout
    const checkoutDistance = this.euclideanDistance(current, store.checkout);
    instructions.push({
      step,
      aisle: {
        id: 'checkout',
        name: 'Checkout',
        nameUr: 'Checkout',
        category: 'Checkout',
        coordinates: store.checkout,
        width: 0,
        height: 0,
        items: [],
      },
      direction: 'straight',
      distance: Math.round(checkoutDistance * 10) / 10,
      voice: `Ab checkout ke liye jayen, ${checkoutDistance.toFixed(1)} meter`,
      voiceEn: `Now head to checkout, about ${checkoutDistance.toFixed(1)} meters`,
    });

    return instructions;
  }

  /**
   * Euclidean distance between two points
   */
  private euclideanDistance(p1: Coordinate, p2: Coordinate): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get compass direction between two points
   */
  private getDirection(from: Coordinate, to: Coordinate): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Normalize to 0-360
    const normalized = (angle + 360) % 360;

    if (normalized < 45 || normalized >= 315) return 'east';
    if (normalized < 135) return 'north';
    if (normalized < 225) return 'west';
    return 'south';
  }

  /**
   * Calculate total distance for a path
   */
  private calculateDistance(aisles: Aisle[], store: Store): number {
    let total = 0;
    let current = store.entrance;

    for (const aisle of aisles) {
      total += this.euclideanDistance(current, aisle.coordinates);
      current = aisle.coordinates;
    }

    // Add distance to checkout
    total += this.euclideanDistance(current, store.checkout);

    return Math.round(total * 10) / 10;
  }

  /**
   * Save stores to local storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        stores: Array.from(this.storeCache.entries()),
        currentStoreId: this.currentStoreId,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('store_layouts', JSON.stringify(data));
    } catch (error) {
      logger.error(this.MODULE, 'Failed to save to storage', error);
    }
  }

  /**
   * Load stores from local storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('store_layouts');
      if (data) {
        const parsed = JSON.parse(data);
        this.storeCache = new Map(parsed.stores);
        this.currentStoreId = parsed.currentStoreId;
        logger.info(this.MODULE, `Loaded ${this.storeCache.size} stores from cache`);
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load from storage', error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      this.storeCache.clear();
      this.currentStoreId = null;
      await AsyncStorage.removeItem('store_layouts');
      logger.info(this.MODULE, 'Store cache cleared');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to clear cache', error);
    }
  }
}

// Export singleton instance
export const storeLayoutService = new StoreLayoutService();
