import { create } from 'zustand';
import type { Cleaner } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';

interface AuthState {
  authenticatedCleaner: Cleaner | null;
  isAuthenticated: boolean;
  login: (cleaner: Cleaner, pin: string) => boolean;
  logout: () => void;
  initializeFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authenticatedCleaner: null,
  isAuthenticated: false,

  login: (cleaner, pin) => {
    // Verify PIN matches
    if (cleaner.pin !== pin) {
      return false;
    }

    // Store authenticated cleaner
    storageHelpers.setObject('authenticated_cleaner', cleaner);
    console.log('[Auth] Saved to storage:', cleaner.name);

    set({
      authenticatedCleaner: cleaner,
      isAuthenticated: true,
    });

    return true;
  },

  logout: () => {
    // Clear storage
    storageHelpers.setObject('authenticated_cleaner', null);

    set({
      authenticatedCleaner: null,
      isAuthenticated: false,
    });
  },

  initializeFromStorage: () => {
    const storedCleaner = storageHelpers.getObject<Cleaner>('authenticated_cleaner');
    console.log('[Auth] initializeFromStorage - storedCleaner:', storedCleaner);

    if (storedCleaner) {
      set({
        authenticatedCleaner: storedCleaner,
        isAuthenticated: true,
      });
      console.log('[Auth] Restored session for:', storedCleaner.name);
    } else {
      console.log('[Auth] No stored session found');
    }
  },
}));
