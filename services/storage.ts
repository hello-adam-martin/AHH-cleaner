import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage interface for cross-platform compatibility
interface Storage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clearAll(): void | Promise<void>;
  waitForReady(): Promise<void>;
}

// Web fallback using localStorage
class WebStorage implements Storage {
  getString(key: string): string | undefined {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || undefined;
    }
    return undefined;
  }

  set(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  delete(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }

  clearAll(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  }

  async waitForReady(): Promise<void> {
    // localStorage is synchronous, always ready
    return;
  }
}

// AsyncStorage wrapper for React Native (synchronous interface)
class AsyncStorageWrapper implements Storage {
  private cache: Map<string, string> = new Map();
  private initPromise: Promise<void>;

  constructor() {
    // Initialize cache asynchronously and store the promise
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      items.forEach(([key, value]) => {
        if (value !== null) {
          this.cache.set(key, value);
        }
      });
    } catch (e) {
      console.error('Failed to initialize AsyncStorage cache', e);
    }
  }

  async waitForReady(): Promise<void> {
    await this.initPromise;
  }

  getString(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: string): void {
    this.cache.set(key, value);
    AsyncStorage.setItem(key, value).catch(e =>
      console.error('Failed to save to AsyncStorage', e)
    );
  }

  delete(key: string): void {
    this.cache.delete(key);
    AsyncStorage.removeItem(key).catch(e =>
      console.error('Failed to delete from AsyncStorage', e)
    );
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
    } catch (e) {
      console.error('Failed to clear AsyncStorage', e);
    }
  }
}

// Initialize storage based on platform
let storage: Storage;

if (Platform.OS === 'web') {
  storage = new WebStorage();
} else {
  // Use AsyncStorage for native platforms (Expo Go compatible)
  storage = new AsyncStorageWrapper();
}

export { storage };

export const waitForStorageReady = () => storage.waitForReady();

export const storageKeys = {
  CLEANERS: 'cleaners',
  PROPERTIES: 'properties',
  ACTIVE_SESSIONS: 'active_sessions',
  COMPLETED_SESSIONS: 'completed_sessions',
  LAST_FETCH_DATE: 'last_fetch_date',
  LOST_PROPERTIES: 'lost_properties',
} as const;

// Helper functions for type-safe storage
export const storageHelpers = {
  getString: (key: string): string | undefined => {
    return storage.getString(key);
  },

  getObject: <T>(key: string): T | undefined => {
    const data = storage.getString(key);
    if (!data) return undefined;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to parse storage data for key "${key}":`, e);
      return undefined;
    }
  },

  setString: (key: string, value: string): void => {
    storage.set(key, value);
  },

  setObject: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  remove: (key: string): void => {
    storage.delete(key);
  },

  clear: async (): Promise<void> => {
    await storage.clearAll();
  },
};
