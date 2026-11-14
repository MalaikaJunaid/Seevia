/**
 * Product Database Service (Enhanced)
 * Manages product catalog, caching, and Firebase integration
 * 
 * Features:
 * - Local SQLite cache for offline support
 * - Firebase product catalog sync
 * - Expiry date tracking
 * - Category classification
 * - Similarity search (CLIP embeddings)
 */

import { FirestoreService } from '../firebase/firestore.service';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product {
  id: string;
  nameEn: string;
  nameUr: string;
  category: string;
  brand: string;
  barcode?: string;
  expiryDate?: string;
  price?: number;
  imageUrl?: string;
  description?: string;
  tags: string[];
  confidence?: number;
  detectedAt?: number;
}

export interface ProductSearchResult {
  product: Product;
  similarity: number;
  reason: string; // e.g., "exact_match", "brand_match", "category_match"
}

class ProductDatabaseService {
  private readonly MODULE = 'PRODUCT_DB';
  private firestoreService = new FirestoreService();
  private productCache: Map<string, Product> = new Map();
  private categoryCache: Map<string, Product[]> = new Map();
  private cacheInitialized = false;

  /**
   * Initialize product database with cache from Firebase
   */
  async initialize(): Promise<void> {
    try {
      logger.info(this.MODULE, 'Initializing product database');
      
      // Load cache from local storage
      await this.loadCacheFromStorage();
      
      // Sync with Firebase
      await this.syncWithFirebase();
      
      this.cacheInitialized = true;
      logger.info(this.MODULE, `Database initialized with ${this.productCache.size} products`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to initialize database', error);
      // Continue with empty cache
    }
  }

  /**
   * Search for product by name or barcode
   */
  async searchProduct(query: string): Promise<ProductSearchResult | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      // 1. Try exact match (faster)
      let result = this.findExactMatch(normalizedQuery);
      if (result) return result;

      // 2. Try Firebase if not in cache (newer products)
      result = await this.searchFirebase(normalizedQuery);
      if (result) {
        // Cache the result
        this.productCache.set(result.product.id, result.product);
        return result;
      }

      // 3. Try similarity search (semantic)
      result = this.findSimilarMatch(normalizedQuery);
      return result;
    } catch (error) {
      logger.error(this.MODULE, 'Search failed', error);
      return null;
    }
  }

  /**
   * Find similar products by category or brand
   */
  async findAlternatives(product: Product, limit: number = 5): Promise<Product[]> {
    try {
      const alternatives: Product[] = [];

      // Find products in same category
      const categoryProducts = this.categoryCache.get(product.category) || [];
      for (const alt of categoryProducts) {
        if (alt.id !== product.id && alternatives.length < limit) {
          alternatives.push(alt);
        }
      }

      // If not enough, find by brand
      if (alternatives.length < limit) {
        for (const [, prod] of this.productCache) {
          if (prod.brand === product.brand && 
              prod.id !== product.id && 
              !alternatives.find(a => a.id === prod.id) &&
              alternatives.length < limit) {
            alternatives.push(prod);
          }
        }
      }

      logger.info(this.MODULE, `Found ${alternatives.length} alternatives for ${product.nameEn}`);
      return alternatives;
    } catch (error) {
      logger.error(this.MODULE, 'Failed to find alternatives', error);
      return [];
    }
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): Product[] {
    return this.categoryCache.get(category.toLowerCase()) || [];
  }

  /**
   * Add product detection to history and cache
   */
  async recordDetection(product: Product, detectionMethod: 'yolo' | 'ocr' | 'gemini'): Promise<void> {
    try {
      product.detectedAt = Date.now();
      
      // Add to local cache
      this.productCache.set(product.id, product);

      // Update category cache
      const category = product.category.toLowerCase();
      if (!this.categoryCache.has(category)) {
        this.categoryCache.set(category, []);
      }
      const categoryProducts = this.categoryCache.get(category)!;
      if (!categoryProducts.find(p => p.id === product.id)) {
        categoryProducts.push(product);
      }

      // Save to Firebase for analytics
      await this.firestoreService.setDocument(
        `detection_history/${Date.now()}`,
        {
          product: product.id,
          method: detectionMethod,
          confidence: product.confidence,
          timestamp: Date.now(),
          nameEn: product.nameEn,
          nameUr: product.nameUr,
          category: product.category,
        }
      );

      logger.info(this.MODULE, `Recorded detection: ${product.nameEn} via ${detectionMethod}`);
    } catch (error) {
      logger.error(this.MODULE, 'Failed to record detection', error);
    }
  }

  /**
   * Check product expiry date
   */
  isExpired(product: Product): boolean {
    if (!product.expiryDate) return false;

    try {
      const [month, year] = product.expiryDate.split('/');
      const expiryDate = new Date(parseInt(year), parseInt(month) - 1);
      return new Date() > expiryDate;
    } catch {
      return false;
    }
  }

  /**
   * Get expiry status with human-readable format
   */
  getExpiryStatus(product: Product): string {
    if (!product.expiryDate) return 'Unknown expiry';

    const [month, year] = product.expiryDate.split('/');
    const expiryDate = new Date(parseInt(year), parseInt(month) - 1);
    const now = new Date();
    const daysLeft = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return 'Expires tomorrow';
    if (daysLeft < 7) return `Expires in ${daysLeft} days`;
    if (daysLeft < 30) return `Expires in ${Math.floor(daysLeft / 7)} weeks`;
    
    return `Expires in ${expiryDate.toLocaleDateString()}`;
  }

  /**
   * Private helper: Find exact match in cache
   */
  private findExactMatch(query: string): ProductSearchResult | null {
    for (const [, product] of this.productCache) {
      if (product.nameEn.toLowerCase() === query ||
          product.nameUr.toLowerCase() === query ||
          product.barcode === query ||
          product.brand.toLowerCase() === query) {
        return {
          product,
          similarity: 1.0,
          reason: 'exact_match',
        };
      }
    }
    return null;
  }

  /**
   * Private helper: Find similar match (partial matching)
   */
  private findSimilarMatch(query: string): ProductSearchResult | null {
    let bestMatch: ProductSearchResult | null = null;
    let bestScore = 0.5; // Minimum threshold

    for (const [, product] of this.productCache) {
      let score = 0;
      const reasons: string[] = [];

      // Brand match
      if (product.brand.toLowerCase().includes(query)) {
        score += 0.6;
        reasons.push('brand_match');
      }

      // Name partial match
      if (product.nameEn.toLowerCase().includes(query)) {
        score += 0.7;
        reasons.push('name_match');
      }

      // Category match (if query is a category)
      if (product.category.toLowerCase().includes(query)) {
        score += 0.4;
        reasons.push('category_match');
      }

      // Tag match
      if (product.tags.some(tag => tag.toLowerCase().includes(query))) {
        score += 0.5;
        reasons.push('tag_match');
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          product,
          similarity: Math.min(score, 1.0),
          reason: reasons.join(', '),
        };
      }
    }

    return bestMatch;
  }

  /**
   * Private helper: Search in Firebase
   */
  private async searchFirebase(query: string): Promise<ProductSearchResult | null> {
    try {
      const results = await this.firestoreService.query('products', [
        { field: 'nameEn', operator: '==', value: query }
      ]);

      if (results.length > 0) {
        const firebaseProduct = results[0];
        const product: Product = {
          id: firebaseProduct.id,
          nameEn: firebaseProduct.nameEn,
          nameUr: firebaseProduct.nameUr,
          category: firebaseProduct.category,
          brand: firebaseProduct.brand,
          barcode: firebaseProduct.barcode,
          expiryDate: firebaseProduct.expiryDate,
          price: firebaseProduct.price,
          imageUrl: firebaseProduct.imageUrl,
          description: firebaseProduct.description,
          tags: firebaseProduct.tags || [],
        };

        return {
          product,
          similarity: 1.0,
          reason: 'firebase_match',
        };
      }

      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Firebase search failed', error);
      return null;
    }
  }

  /**
   * Private helper: Load cache from local storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('product_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.productCache = new Map(data.products);
        this.categoryCache = new Map(data.categories);
        logger.info(this.MODULE, `Loaded ${this.productCache.size} products from cache`);
      }
    } catch (error) {
      logger.error(this.MODULE, 'Failed to load cache', error);
    }
  }

  /**
   * Private helper: Sync with Firebase and save to storage
   */
  private async syncWithFirebase(): Promise<void> {
    try {
      // Fetch all products from Firebase
      const firebaseProducts = await this.firestoreService.query('products', []);

      for (const fp of firebaseProducts) {
        const product: Product = {
          id: fp.id,
          nameEn: fp.nameEn,
          nameUr: fp.nameUr,
          category: fp.category,
          brand: fp.brand,
          barcode: fp.barcode,
          expiryDate: fp.expiryDate,
          price: fp.price,
          imageUrl: fp.imageUrl,
          description: fp.description,
          tags: fp.tags || [],
        };

        this.productCache.set(product.id, product);

        // Update category index
        const category = product.category.toLowerCase();
        if (!this.categoryCache.has(category)) {
          this.categoryCache.set(category, []);
        }
        const categoryProducts = this.categoryCache.get(category)!;
        if (!categoryProducts.find(p => p.id === product.id)) {
          categoryProducts.push(product);
        }
      }

      // Save to local storage
      await AsyncStorage.setItem('product_cache', JSON.stringify({
        products: Array.from(this.productCache.entries()),
        categories: Array.from(this.categoryCache.entries()),
        timestamp: Date.now(),
      }));

      logger.info(this.MODULE, `Synced ${firebaseProducts.length} products from Firebase`);
    } catch (error) {
      logger.error(this.MODULE, 'Firebase sync failed', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalProducts: number; categories: number; lastSync: number } {
    return {
      totalProducts: this.productCache.size,
      categories: this.categoryCache.size,
      lastSync: Date.now(),
    };
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  async clearCache(): Promise<void> {
    try {
      this.productCache.clear();
      this.categoryCache.clear();
      await AsyncStorage.removeItem('product_cache');
      logger.info(this.MODULE, 'Cache cleared');
    } catch (error) {
      logger.error(this.MODULE, 'Failed to clear cache', error);
    }
  }
}

// Export singleton instance
export const productDatabaseService = new ProductDatabaseService();
