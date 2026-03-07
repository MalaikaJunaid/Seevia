import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Product } from '@/src/models/Product';
import { productDatabaseService } from './productDatabase.service';
import hapticService from '@/src/services/common/haptic.service';
import { logger } from '@/src/utils/logger';

/**
 * Seevia Barcode Service
 * Manages camera-based barcode scanning and product identification.
 */
export class BarcodeService {
  private static readonly MODULE = 'BARCODE_SERVICE';

  /**
   * Request camera permissions for the scanner
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error(this.MODULE, 'Camera permission error', error);
      return false;
    }
  }

  /**
   * Identifies a product by barcode string.
   * Priority: Local DB -> External API -> Null.
   */
  static async lookupBarcode(barcode: string): Promise<Product | null> {
    try {
      // 1. Try local database (Faster, includes local brands like Olpers/Tapal)
      const localProduct = await productDatabaseService.findByBarcode(barcode);
      if (localProduct) {
        await hapticService.success();
        return localProduct as Product;
      }

      // 2. Fallback to Open Food Facts API for international items
      const externalProduct = await this.lookupBarcodeExternal(barcode);
      if (externalProduct) {
        await hapticService.success();
        return externalProduct;
      }

      await hapticService.warning();
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'Barcode identification failed', error);
      return null;
    }
  }

  private static async lookupBarcodeExternal(barcode: string): Promise<Product | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          id: barcode,
          barcode,
          name: p.product_name || 'Unknown Item',
          brand: p.brands || 'Unknown Brand',
          category: p.categories_tags?.[0] || 'Grocery',
          imageUrl: p.image_url,
          averageShelfLife: 30, // Default assumption
        };
      }
      return null;
    } catch (error) {
      logger.error(this.MODULE, 'External API error', error);
      return null;
    }
  }

  /**
   * Entry point for UI Scanner results
   */
  static async handleScan(
    scanResult: BarCodeScannerResult,
    onProduct: (product: Product) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const product = await this.lookupBarcode(scanResult.data);
    if (product) {
      onProduct(product);
    } else {
      onError(`Item not recognized: ${scanResult.data}`);
    }
  }
}
