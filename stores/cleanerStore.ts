import { create } from 'zustand';
import type { Cleaner } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';

interface CleanerState {
  selectedCleaner: Cleaner | null;
  cleaners: Cleaner[];
  selectCleaner: (cleaner: Cleaner) => void;
  clearCleaner: () => void;
  setCleaners: (cleaners: Cleaner[]) => void;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useCleanerStore = create<CleanerState>((set) => ({
  selectedCleaner: null,
  cleaners: [],

  selectCleaner: (cleaner) => {
    storageHelpers.setObject(storageKeys.SELECTED_CLEANER, cleaner);
    set({ selectedCleaner: cleaner });
  },

  clearCleaner: () => {
    storageHelpers.remove(storageKeys.SELECTED_CLEANER);
    set({ selectedCleaner: null });
  },

  setCleaners: (cleaners) => {
    storageHelpers.setObject(storageKeys.CLEANERS, cleaners);
    set({ cleaners });
  },

  initializeFromStorage: () => {
    const selectedCleaner = storageHelpers.getObject<Cleaner>(
      storageKeys.SELECTED_CLEANER
    );
    const cleaners = storageHelpers.getObject<Cleaner[]>(storageKeys.CLEANERS) || [];

    set({ selectedCleaner, cleaners });
  },

  reset: () => {
    set({ selectedCleaner: null, cleaners: [] });
  },
}));
