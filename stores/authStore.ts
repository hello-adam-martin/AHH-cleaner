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
      console.log('❌ Invalid PIN');
      return false;
    }

    console.log(`✓ ${cleaner.name} logged in successfully`);

    // Store authenticated cleaner
    storageHelpers.setObject('authenticated_cleaner', cleaner);

    set({
      authenticatedCleaner: cleaner,
      isAuthenticated: true,
    });

    return true;
  },

  logout: () => {
    console.log('Logging out...');

    // Clear storage
    storageHelpers.setObject('authenticated_cleaner', null);

    set({
      authenticatedCleaner: null,
      isAuthenticated: false,
    });
  },

  initializeFromStorage: () => {
    const storedCleaner = storageHelpers.getObject<Cleaner>('authenticated_cleaner');

    if (storedCleaner) {
      console.log(`Restored session for ${storedCleaner.name}`);
      set({
        authenticatedCleaner: storedCleaner,
        isAuthenticated: true,
      });
    }
  },
}));
