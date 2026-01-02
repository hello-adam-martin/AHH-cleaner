import { create } from 'zustand';
import type { LostPropertyItem } from '@/types';
import { storageHelpers, storageKeys } from '@/services/storage';
import { syncLostProperty, resolveLostPropertyApi, fetchLostProperties, isAirtableConfigured } from '@/services/backendApiService';

interface LostPropertyState {
  lostProperties: LostPropertyItem[];
  isSyncing: boolean;
  addLostProperty: (
    item: Omit<LostPropertyItem, 'id' | 'status' | 'reportedAt'>,
    photoBase64?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resolveLostProperty: (id: string, cleanerId: string) => Promise<{ success: boolean; error?: string }>;
  getLostPropertiesForProperty: (propertyId: string) => LostPropertyItem[];
  fetchFromServer: () => Promise<void>;
  initializeFromStorage: () => void;
  reset: () => void;
}

export const useLostPropertyStore = create<LostPropertyState>((set, get) => ({
  lostProperties: [],
  isSyncing: false,

  addLostProperty: async (itemData, photoBase64) => {
    if (!isAirtableConfigured()) {
      return { success: false, error: 'Not connected to server' };
    }

    const newItem: LostPropertyItem = {
      ...itemData,
      id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'reported',
      reportedAt: Date.now(),
    };

    set({ isSyncing: true });

    // Sync to Airtable - this is required (no offline mode)
    const result = await syncLostProperty(newItem, photoBase64);

    if (result.success) {
      // Update with the returned data (includes Airtable photo URL)
      const savedItem: LostPropertyItem = {
        ...newItem,
        photoUrl: result.photoUrl,
      };

      set((state) => {
        const updated = [savedItem, ...state.lostProperties];
        storageHelpers.setObject(storageKeys.LOST_PROPERTIES, updated);
        return { lostProperties: updated, isSyncing: false };
      });

      return { success: true };
    } else {
      set({ isSyncing: false });
      return { success: false, error: result.error || 'Failed to save lost property' };
    }
  },

  resolveLostProperty: async (id, cleanerId) => {
    const item = get().lostProperties.find((p) => p.id === id);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Only the reporter can resolve
    if (item.cleanerId !== cleanerId) {
      return { success: false, error: 'Only the reporter can resolve this item' };
    }

    if (!isAirtableConfigured()) {
      return { success: false, error: 'Not connected to server' };
    }

    set({ isSyncing: true });

    const result = await resolveLostPropertyApi(id);

    if (result.success) {
      set((state) => {
        const updated = state.lostProperties.map((p) =>
          p.id === id
            ? { ...p, status: 'resolved' as const, resolvedAt: Date.now() }
            : p
        );
        storageHelpers.setObject(storageKeys.LOST_PROPERTIES, updated);
        return { lostProperties: updated, isSyncing: false };
      });
      return { success: true };
    } else {
      set({ isSyncing: false });
      return { success: false, error: result.error || 'Failed to resolve item' };
    }
  },

  getLostPropertiesForProperty: (propertyId) => {
    return get().lostProperties.filter((p) => p.propertyId === propertyId);
  },

  fetchFromServer: async () => {
    if (!isAirtableConfigured()) {
      return;
    }

    const items = await fetchLostProperties();
    if (items) {
      set({ lostProperties: items });
      storageHelpers.setObject(storageKeys.LOST_PROPERTIES, items);
    }
  },

  initializeFromStorage: () => {
    const lostProperties =
      storageHelpers.getObject<LostPropertyItem[]>(storageKeys.LOST_PROPERTIES) || [];
    set({ lostProperties });
  },

  reset: () => {
    set({ lostProperties: [], isSyncing: false });
  },
}));
