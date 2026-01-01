import { create } from 'zustand';
import type { Property } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { fetchTodaysCheckouts, fetchMissedCleanings } from '@/services/backendApiService';

interface PropertiesState {
  properties: Property[];
  missedCleanings: Property[];
  setProperties: (properties: Property[]) => void;
  addProperty: (property: Property) => void;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  refreshFromAirtable: () => Promise<void>;
  refreshMissedCleanings: () => Promise<void>;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const usePropertiesStore = create<PropertiesState>((set) => ({
  properties: [],
  missedCleanings: [],

  setProperties: (properties) => {
    storageHelpers.setObject(storageKeys.PROPERTIES, properties);
    set({ properties });
  },

  addProperty: (property) =>
    set((state) => {
      const updated = [...state.properties, property];
      storageHelpers.setObject(storageKeys.PROPERTIES, updated);
      return { properties: updated };
    }),

  updateProperty: (id, updates) =>
    set((state) => {
      const updated = state.properties.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      storageHelpers.setObject(storageKeys.PROPERTIES, updated);
      return { properties: updated };
    }),

  refreshFromAirtable: async () => {
    console.log('Refreshing properties from Airtable...');
    const airtableProperties = await fetchTodaysCheckouts();

    if (airtableProperties && airtableProperties.length > 0) {
      storageHelpers.setObject(storageKeys.PROPERTIES, airtableProperties);
      set({ properties: airtableProperties });
      console.log(`✓ Refreshed ${airtableProperties.length} properties from Airtable`);
    } else {
      console.log('No properties returned from Airtable');
    }
  },

  refreshMissedCleanings: async () => {
    console.log('Fetching missed cleanings...');
    const missed = await fetchMissedCleanings();

    if (missed) {
      set({ missedCleanings: missed });
      console.log(`✓ Fetched ${missed.length} missed cleanings`);
    } else {
      console.log('No missed cleanings returned');
    }
  },

  initializeFromStorage: () => {
    const properties =
      storageHelpers.getObject<Property[]>(storageKeys.PROPERTIES) || [];
    set({ properties });
  },

  reset: () => {
    set({ properties: [], missedCleanings: [] });
  },
}));
