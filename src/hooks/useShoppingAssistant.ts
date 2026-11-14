import { useEffect, useState, useCallback, useRef } from 'react';
import {
  visionControllerService,
  productDatabaseService,
  shoppingListService,
  storeLayoutService,
  type DetectionResult,
  type Product,
  type ShoppingList,
  type Store,
  type NavigationPath,
} from '@/services/shopping';
import { useVoiceCommands } from './useVoiceCommands';
import { useAccessibility } from './useAccessibility';

interface UseShoppingAssistantReturn {
  // State
  currentProduct: Product | null;
  shoppingList: ShoppingList | null;
  currentStore: Store | null;
  navigationPath: NavigationPath | null;
  isDetecting: boolean;
  error: string | null;

  // Detection
  detectProduct: (imageUri: string) => Promise<void>;
  searchByVoice: (query: string) => Promise<void>;

  // Shopping List
  addToList: (product: Product) => Promise<void>;
  removeFromList: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  createNewList: (name: string) => Promise<void>;

  // Navigation
  loadStore: (storeId: string) => Promise<void>;
  calculatePath: (categories: string[]) => void;
  getCurrentInstruction: () => any;
  moveToNextAisle: () => void;

  // Recommendations
  getAlternatives: () => Promise<Product[]>;

  // Stats
  getListStats: () => any;
}

/**
 * Main hook for shopping assistant functionality
 */
export const useShoppingAssistant = (): UseShoppingAssistantReturn => {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [navigationPath, setNavigationPath] = useState<NavigationPath | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAisleIndex = useRef(0);
  const { announce } = useAccessibility();

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        await visionControllerService.initialize();
        await productDatabaseService.initialize();
        await shoppingListService.initialize();
        await storeLayoutService.initialize();

        // Create default shopping list if none exists
        const lists = shoppingListService.getAllLists();
        if (lists.length === 0) {
          const newList = await shoppingListService.createList(
            'My Shopping List',
            'Mere Shopping List'
          );
          setShoppingList(newList);
        } else {
          const activeList = shoppingListService.getActiveList();
          if (activeList) {
            setShoppingList(activeList);
          }
        }

        announce('Shopping assistant ready');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Initialization failed';
        setError(message);
        announce(`Shopping assistant error: ${message}`);
      }
    };

    initServices();
  }, [announce]);

  // Register voice commands
  useEffect(() => {
    const { registerCommand } = useVoiceCommands();

    // Shopping commands
    registerCommand('start shopping', async () => {
      announce('Shopping mode activated');
    });

    registerCommand('add to list', async () => {
      if (currentProduct) {
        await addToList(currentProduct);
      } else {
        announce('No product detected');
      }
    });

    registerCommand('next product', async () => {
      announce('Ready to scan next product');
    });

    registerCommand('checkout', async () => {
      if (shoppingList) {
        await completeShoppingSession();
      }
    });

    registerCommand('show list', async () => {
      if (shoppingList) {
        announce(`Shopping list has ${shoppingList.itemCount} items`);
      }
    });
  }, [currentProduct, shoppingList, announce]);

  const detectProduct = useCallback(
    async (imageUri: string) => {
      setIsDetecting(true);
      setError(null);

      try {
        announce('Analyzing product');
        const result = await visionControllerService.detectProductFromImage(imageUri);

        if (result.product) {
          setCurrentProduct(result.product);
          announce(
            `Found ${result.product.nameEn}. Brand: ${result.product.brand}. Confidence: ${(result.confidence * 100).toFixed(0)}%`
          );

          // Add expiry info if available
          if (result.product.expiryDate) {
            const expiryStatus = productDatabaseService.getExpiryStatus(result.product);
            announce(expiryStatus);
          }
        } else {
          announce('Could not identify product');
        }

        if (result.errorMessage) {
          setError(result.errorMessage);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Detection failed';
        setError(message);
        announce(`Error: ${message}`);
      } finally {
        setIsDetecting(false);
      }
    },
    [announce]
  );

  const searchByVoice = useCallback(
    async (query: string) => {
      try {
        announce('Searching for product');
        const product = await visionControllerService.detectByVoiceCommand(query);

        if (product) {
          setCurrentProduct(product);
          announce(`Found ${product.nameEn}. Add to list?`);
        } else {
          announce('Product not found');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        announce(`Search error: ${message}`);
      }
    },
    [announce]
  );

  const addToList = useCallback(
    async (product: Product) => {
      if (!shoppingList) {
        announce('No shopping list active');
        return;
      }

      try {
        await shoppingListService.addItem(shoppingList.id, product, 1);
        const updated = shoppingListService.getActiveList();
        setShoppingList(updated);
        announce(`Added ${product.nameEn} to list`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        setError(message);
        announce(`Error: ${message}`);
      }
    },
    [shoppingList, announce]
  );

  const removeFromList = useCallback(
    async (productId: string) => {
      if (!shoppingList) return;

      try {
        await shoppingListService.removeItem(shoppingList.id, productId);
        const updated = shoppingListService.getActiveList();
        setShoppingList(updated);
        announce('Item removed from list');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove item';
        setError(message);
      }
    },
    [shoppingList, announce]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (!shoppingList) return;

      try {
        await shoppingListService.updateQuantity(shoppingList.id, productId, quantity);
        const updated = shoppingListService.getActiveList();
        setShoppingList(updated);
        announce(`Updated quantity to ${quantity}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update quantity';
        setError(message);
      }
    },
    [shoppingList, announce]
  );

  const createNewList = useCallback(
    async (name: string) => {
      try {
        const newList = await shoppingListService.createList(name, `${name} - Urdu`);
        setShoppingList(newList);
        announce(`Created new list: ${name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create list';
        setError(message);
        announce(`Error: ${message}`);
      }
    },
    [announce]
  );

  const loadStore = useCallback(
    async (storeId: string) => {
      try {
        announce('Loading store layout');
        const store = await storeLayoutService.loadStore(storeId);
        if (store) {
          setCurrentStore(store);
          announce(`Loaded store: ${store.name}`);
        } else {
          announce('Store not found');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load store';
        setError(message);
        announce(`Error: ${message}`);
      }
    },
    [announce]
  );

  const calculatePath = useCallback(
    (categories: string[]) => {
      if (!currentStore) {
        announce('No store loaded');
        return;
      }

      try {
        const path = storeLayoutService.calculateShoppingPath(currentStore.id, categories);
        setNavigationPath(path);
        currentAisleIndex.current = 0;
        announce(
          `Route calculated. ${path.aisles.length} stops. Estimated time: ${Math.floor(path.estimatedTime / 60)} minutes`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate path';
        setError(message);
      }
    },
    [currentStore, announce]
  );

  const getCurrentInstruction = useCallback(() => {
    if (!navigationPath) return null;
    return storeLayoutService.getNextInstruction(navigationPath, currentAisleIndex.current);
  }, [navigationPath]);

  const moveToNextAisle = useCallback(() => {
    if (!navigationPath) return;

    if (currentAisleIndex.current < navigationPath.instructions.length - 1) {
      currentAisleIndex.current++;
      const instruction = getCurrentInstruction();
      if (instruction) {
        announce(instruction.voice);
      }
    } else {
      announce('You have reached the end of your shopping list');
    }
  }, [navigationPath, announce, getCurrentInstruction]);

  const getAlternatives = useCallback(async () => {
    if (!currentProduct) return [];

    try {
      return await visionControllerService.getProductRecommendations(currentProduct);
    } catch (err) {
      logger.error('Failed to get alternatives', err);
      return [];
    }
  }, [currentProduct]);

  const getListStats = useCallback(() => {
    return shoppingListService.getListStats();
  }, []);

  const completeShoppingSession = useCallback(async () => {
    if (!shoppingList) return;

    try {
      await shoppingListService.completePurchase(
        shoppingList.id,
        currentStore?.name,
        currentStore?.id
      );
      setShoppingList(null);
      setCurrentStore(null);
      setNavigationPath(null);
      announce('Purchase completed. Thank you for shopping');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setError(message);
      announce(`Checkout error: ${message}`);
    }
  }, [shoppingList, currentStore, announce]);

  return {
    // State
    currentProduct,
    shoppingList,
    currentStore,
    navigationPath,
    isDetecting,
    error,

    // Methods
    detectProduct,
    searchByVoice,
    addToList,
    removeFromList,
    updateQuantity,
    createNewList,
    loadStore,
    calculatePath,
    getCurrentInstruction,
    moveToNextAisle,
    getAlternatives,
    getListStats,
  };
};
