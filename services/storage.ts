import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage change callback type
type StorageChangeCallback = (key: string) => void;

// Storage interface for cross-platform compatibility
interface Storage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clearAll(): void | Promise<void>;
  waitForReady(): Promise<void>;
  onStorageChange?(callback: StorageChangeCallback): () => void;
}

// Web fallback using localStorage with cross-tab synchronization
class WebStorage implements Storage {
  private listeners: Set<StorageChangeCallback> = new Set();

  constructor() {
    // Listen for storage changes from other tabs/windows
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key) {
          this.listeners.forEach(listener => listener(e.key!));
        }
      });
    }
  }

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

  // Subscribe to storage changes from other tabs
  onStorageChange(callback: StorageChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
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

// Subscribe to storage changes from other tabs (web only)
export const onStorageChange = (callback: StorageChangeCallback): (() => void) => {
  if (storage.onStorageChange) {
    return storage.onStorageChange(callback);
  }
  // Return no-op unsubscribe for native
  return () => {};
};

export const storageKeys = {
  CLEANERS: 'cleaners',
  PROPERTIES: 'properties',
  ACTIVE_SESSIONS: 'active_sessions',
  COMPLETED_SESSIONS: 'completed_sessions',
  LAST_FETCH_DATE: 'last_fetch_date',
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
