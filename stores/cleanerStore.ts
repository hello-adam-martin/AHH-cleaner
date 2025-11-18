import { create } from 'zustand';
import type { Cleaner } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';

interface CleanerState {
  cleaners: Cleaner[];
  setCleaners: (cleaners: Cleaner[]) => void;
  initializeFromStorage: () => void;
}

export const useCleanerStore = create<CleanerState>((set) => ({
  cleaners: [],

  setCleaners: (cleaners) => {
    storageHelpers.setObject(storageKeys.CLEANERS, cleaners);
    set({ cleaners });
  },

  initializeFromStorage: () => {
    const cleaners = storageHelpers.getObject<Cleaner[]>(storageKeys.CLEANERS) || [];
    set({ cleaners });
  },
}));
