import { create } from 'zustand';
import type { LostPropertyItem } from '@/types';
import { syncLostProperty, isAirtableConfigured } from '@/services/backendApiService';

interface LostPropertyState {
  isSyncing: boolean;
  addLostProperty: (
    item: Omit<LostPropertyItem, 'id' | 'status' | 'reportedAt'>,
    photoBase64?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useLostPropertyStore = create<LostPropertyState>((set) => ({
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

    const result = await syncLostProperty(newItem, photoBase64);

    set({ isSyncing: false });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Failed to save lost property' };
    }
  },
}));
