import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Seevia Persistence Wrapper
 * Provides type-safe access to local device storage.
 */

const PREFIX = '@seevia_';

export const storage = {
  /**
   * Save data to local storage
   */
  async save<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(`${PREFIX}${key}`, jsonValue);
    } catch (e) {
      console.error(`Storage Save Error [${key}]:`, e);
    }
  },

  /**
   * Retrieve data from local storage with type casting
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(`${PREFIX}${key}`);
      return jsonValue != null ? (JSON.parse(jsonValue) as T) : null;
    } catch (e) {
      console.error(`Storage Get Error [${key}]:`, e);
      return null;
    }
  },

  /**
   * Remove a specific item
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${PREFIX}${key}`);
    } catch (e) {
      console.error(`Storage Remove Error [${key}]:`, e);
    }
  },

  /**
   * Clear all Seevia-related data
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const seeviaKeys = keys.filter(k => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(seeviaKeys);
    } catch (e) {
      console.error('Storage Clear Error:', e);
    }
  },

  /**
   * Check if a key exists
   */
  async contains(key: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(`${PREFIX}${key}`);
    return value !== null;
  }
};
